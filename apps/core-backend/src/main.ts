import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initBucket } from './minio-client';

async function bootstrap() {
  await initBucket();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
