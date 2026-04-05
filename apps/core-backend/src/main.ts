import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; // 🟦 1. Import cookie-parser

async function bootstrap() {
  // 🟦 3. Create Nest app
  const app = await NestFactory.create(AppModule);

  // 🟦 4. Use Cookie Parser (New Security Step)
  // This allows the server to read the 'token' cookie from the request
  app.use(cookieParser());

  // 🟦 5. Enable CORS with Credentials
  // 🟦 5. Enable CORS with Credentials
  app.enableCors({
    origin: ['http://localhost:5173', /^https:\/\/.*\.onrender\.com$/], // Dynamic Cloud URLs
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // ⚠️ CRITICAL: Allows cookies to be sent back and forth
  });

  // 🟦 6. Start server
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();