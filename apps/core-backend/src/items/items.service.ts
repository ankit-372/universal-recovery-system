import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Item } from './entities/item.entity';
import { uploadToCloudinary } from '../cloudinary-client';
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

  async create(file: Express.Multer.File, description: string, userId: string, isLost: boolean) {
    const bucketName = 'lost-items';

    // 1. Upload to Cloudinary instead of MinIO
    const imageUrl = await uploadToCloudinary(file.buffer, bucketName);

    // 2. Save Initial Record
    const newItem = this.itemsRepository.create({
      description,
      imageUrl,
      user: { id: userId } as any,
      isLost: isLost,
      tags: [],
      vector: []
    });

    const savedItem = await this.itemsRepository.save(newItem);

    // 3. AI Analysis (Generate Vector)
    try {
      const formData = new FormData();
      formData.append('file', file.buffer, { filename: file.originalname });
      formData.append('item_id', savedItem.id);
      formData.append('description', description || "");
      formData.append('is_lost', String(isLost));

      const response = await firstValueFrom(
        this.httpService.post(`${process.env.VISION_SERVICE_URL || 'http://localhost:8000'}/analyze`, formData, {
          headers: { ...formData.getHeaders() },
        }),
      );

      if (response.data.detected_objects) {
        savedItem.tags = response.data.detected_objects;
      }
      if (response.data.vector) {
        savedItem.vector = response.data.vector;
      }
      await this.itemsRepository.save(savedItem);
    } catch (err) {
      console.error("❌ AI/Milvus Error:", err.message);
    }

    // 4. SEARCH LOGIC
    // If we are reporting a LOST item, we want to find items others FOUND.
    if (isLost) {
      console.log("🔍 Lost Item Reported. Searching only FOUND items (Vector Search)...");

      // Pass 'false' to search for items where is_lost == false (Found items)
      // This uses the Image File for Vector Search
      const matches = await this.search(description, file, false);

      const filteredMatches = matches
        .filter(match => {
          // Rule: Exclude items uploaded by ME
          if (match.user && match.user.id === userId) {
            return false;
          }
          return true;
        })
        // Rule: Sort by Score (Highest First)
        .sort((a, b) => b.score - a.score)
        // Rule: Return Top 5
        .slice(0, 5);

      console.log(`DEBUG: Found ${matches.length} matches -> Returned top ${filteredMatches.length}`);

      return { ...savedItem, matches: filteredMatches };
    }

    return savedItem;
  }

  async search(queryText: string, file?: Express.Multer.File, filterIsLost?: boolean) {
    try {
      let response;

      // 🚨 FORCE IMAGE SEARCH IF FILE EXISTS
      if (file) {
        console.log("🚀 Sending Image to Python for Vector Search...");
        const formData = new FormData();
        formData.append('file', file.buffer, { filename: file.originalname });

        // Filter: If I am "Lost", I want "Found" (filterIsLost = false)
        if (filterIsLost !== undefined) {
          formData.append('filter_is_lost', String(filterIsLost));
        }

        response = await firstValueFrom(
          this.httpService.post(`${process.env.VISION_SERVICE_URL || 'http://localhost:8000'}/search`, formData, {
            headers: { ...formData.getHeaders() }
          })
        );
      }
      // Fallback to text search if no file (rare for this flow)
      else {
        const params = new URLSearchParams();
        params.append('text', queryText);
        if (filterIsLost !== undefined) params.append('filter_is_lost', String(filterIsLost));

        response = await firstValueFrom(
          this.httpService.post(`${process.env.VISION_SERVICE_URL || 'http://localhost:8000'}/search`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          })
        );
      }

      const results = response.data;
      if (!results || results.length === 0) return [];

      const ids = results.map((r: any) => r.external_id);

      // Fetch details from DB
      const items = await this.itemsRepository.find({
        where: { id: In(ids) },
        relations: ['user'],
      });

      // Map scores and return
      return results.map((result: any) => {
        const item = items.find((i) => i.id === result.external_id);
        if (!item) return null;
        return { ...item, score: result.score };
      }).filter((i: any) => i !== null);

    } catch (err) {
      console.error("❌ Search Error:", err.message);
      return [];
    }
  }

  findAll() { return this.itemsRepository.find(); }

  async findByUser(userId: string) {
    if (!userId) return [];
    return this.itemsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async nuke() {
    console.log("☢️ NUKING DATABASE ☢️");

    // 1. Clear Postgres
    await this.itemsRepository.clear(); // Truncates the table

    // 2. Clear Milvus
    try {
      await firstValueFrom(this.httpService.delete(`${process.env.VISION_SERVICE_URL || 'http://localhost:8000'}/reset`));
      console.log("✅ Milvus reset successfully");
    } catch (e) {
      console.error("❌ Failed to reset Milvus:", e.message);
    }

    return { status: 'Database Nuked 🤯' };
  }
}