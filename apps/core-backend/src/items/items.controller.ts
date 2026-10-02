import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Req,
  UseGuards,
  Delete,
  Query,
  Res,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItemsService } from './items.service';
import { DebugAuthGuard } from '../auth/debug-auth.guard';
import { validateUploadedFile } from '../common/file-validation';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import * as https from 'https';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  // 🛡️ Rate limit: Max 10 item creations per minute (AI + vector ops + storage protection)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @UseGuards(DebugAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard limit
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('type') type: string,
    @Req() req: any,
  ) {
    // 🔒 Enforce file size, MIME-type, and magic-byte signature validation
    validateUploadedFile(file);

    const userId = req.user.id;
    console.log(`📝 Uploading Item for User ID: ${userId}`);

    const isLost = type === 'lost';
    console.log(`📝 Item Type: '${type}', isLost: ${isLost}`);

    return this.itemsService.create(file, description, userId, isLost);
  }

  // 🛡️ Rate limit: Max 20 searches per minute to prevent GPU/Vector search saturation
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('search')
  async search(@Body('text') text: string) {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Search text cannot be empty');
    }
    return this.itemsService.search(text);
  }

  // 🛡️ SSRF Protected Image Proxy for Cloudinary
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('image/proxy')
  proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) return res.status(400).send('No image URL provided');

    // 🔒 Strict URL parsing to prevent prefix-bypass and SSRF attacks
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).send('Invalid URL format');
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') {
      return res.status(403).send('Proxy only allowed for https://res.cloudinary.com assets');
    }

    // Disallow embedded credentials (e.g. https://user:pass@res.cloudinary.com)
    if (parsed.username || parsed.password) {
      return res.status(403).send('Invalid URL format');
    }

    https.get(url, (imageRes) => {
      // 🔒 Ensure upstream response is actually an image before serving
      const contentType = imageRes.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        return res.status(403).send('Upstream resource is not a valid image');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      imageRes.pipe(res);
    }).on('error', (e) => {
      console.error("Proxy error:", e);
      res.status(500).send('Image proxy failed');
    });
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @UseGuards(DebugAuthGuard)
  @Get('mine')
  async getMyItems(@Req() req) {
    const userId = req.user.id;
    return this.itemsService.findByUser(userId);
  }

  // 🔒 Protected Nuke endpoint: Disabled in production and requires verified Admin email
  @Delete('nuke')
  @UseGuards(DebugAuthGuard)
  async nukeDatabase(@Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Destructive database reset is strictly disabled in production');
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || req.user.email !== adminEmail) {
      throw new ForbiddenException('Unauthorized: Only configured administrative accounts can execute database reset');
    }

    console.warn(`☢️ NUKING DATABASE: Initiated by verified admin ${req.user.email}`);
    return this.itemsService.nuke();
  }
}