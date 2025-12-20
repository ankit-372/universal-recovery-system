import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Req, UseGuards, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItemsService } from './items.service';
import { DebugAuthGuard } from '../auth/debug-auth.guard'; // Keeping your verified guard

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  @Post()
  @UseGuards(DebugAuthGuard) // 🔒 Protects this route
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('type') type: string, // 'lost' or 'found'
    @Req() req: any, // Access the logged-in user
  ) {
    // ✅ Extract Real User ID from the Token (from DebugAuthGuard/JwtStrategy)
    // JwtStrategy returns { id, email, name }
    const userId = req.user.id;
    console.log(`📝 Uploading Item for User ID: ${userId}`);

    // Convert string to boolean
    const isLost = type === 'lost';
    console.log(`📝 Item Type: '${type}', isLost: ${isLost}`);

    return this.itemsService.create(file, description, userId, isLost);
  }

  @Post('search')
  async search(@Body('text') text: string) {
    return this.itemsService.search(text);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @UseGuards(DebugAuthGuard) // Protect this route
  @Get('mine')
  async getMyItems(@Req() req) {
    // req.user is populated by the Guard (from the Token via JwtStrategy)
    // JwtStrategy returns { id, email, name }
    const userId = req.user.id;
    return this.itemsService.findByUser(userId);
  }


  @Delete('nuke')
  async nukeDatabase() {
    console.warn("☢️ NUKING DATABASE: Deleting all items...");
    return this.itemsService.nuke();
  }
}