import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { minioClient } from '../minio-client';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    private readonly httpService: HttpService,
  ) { }

  async create(file: Express.Multer.File, description: string, userId: string) {
    const bucketName = 'lost-items';
    const fileName = `${Date.now()}-${file.originalname}`;

    // --- 1. Upload to S3 (MinIO) ---
    await minioClient.putObject(bucketName, fileName, file.buffer);
    const imageUrl = `http://localhost:9000/${bucketName}/${fileName}`;

    // --- 2. Create Postgres Entry FIRST (To get the ID) ---
    const newItem = this.itemsRepository.create({
      description,
      imageUrl,
      user: { id: userId } as any,
      isLost: true,
      tags: [],
      vector: []
    });
    
    // We save here to generate the unique 'id' (e.g., uuid)
    const savedItem = await this.itemsRepository.save(newItem);

    // --- 3. Call Python (Send File + Description + ID) ---
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname });
      formData.append('description', description);
      
      // CRITICAL UPDATE: Pass the Postgres ID to Python
      formData.append('item_id', savedItem.id); 

      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/analyze', formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      console.log("✅ AI Analysis & Milvus Save Complete:", response.data);

      // --- 4. Update Postgres with AI Tags ---
      // Python returns: { "detected_objects": ["bag", "red"], ... }
      if (response.data.detected_objects) {
        savedItem.tags = response.data.detected_objects;
        await this.itemsRepository.save(savedItem); // Update the DB with new tags
        console.log("✅ Tags updated in Postgres");
      }

    } catch (err) {
      console.error("❌ AI/Milvus Error:", err.message);
      // We don't throw here so the item is still saved in Postgres even if AI fails
    }

    return savedItem;
  }

  findAll() { return this.itemsRepository.find(); }
}