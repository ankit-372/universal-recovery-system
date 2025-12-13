import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Req, UseGuards, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItemsService } from './items.service';
import { AuthGuard } from '@nestjs/passport';

import { DebugAuthGuard } from '../auth/debug-auth.guard';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  @Post()
  @UseGuards(DebugAuthGuard)
  @UseInterceptors(FileInterceptor('file')) // This expects a field named 'file'
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Req() req,
  ) {
    // 1. Validation Check (Prevents the crash)
    if (!file) {
      throw new BadRequestException('File is missing! Please upload an image with key "file".');
    }

    // 2. User Check
    if (!req.user || !req.user.id) {
      throw new InternalServerErrorException('User ID not found in Request');
    }

    const userId = req.user.id;
    console.log("✅ Processing Upload for User:", userId);

    return this.itemsService.create(file, description, userId);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }
}