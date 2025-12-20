import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initBucket } from './minio-client';
import cookieParser from 'cookie-parser'; // 🟦 1. Import cookie-parser

async function bootstrap() {
  // 🟦 2. Initialize MinIO bucket before app starts (Keep your existing logic)
  await initBucket();

  // 🟦 3. Create Nest app
  const app = await NestFactory.create(AppModule);

  // 🟦 4. Use Cookie Parser (New Security Step)
  // This allows the server to read the 'token' cookie from the request
  app.use(cookieParser());

  // 🟦 5. Enable CORS with Credentials
  app.enableCors({
    origin: 'http://localhost:5173', // Must match your Frontend URL exactly
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // ⚠️ CRITICAL: Allows cookies to be sent back and forth
  });

  // 🟦 6. Start server
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();