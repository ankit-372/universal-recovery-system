import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // 🛡️ CRITICAL for Render/Proxies: Allows secure cookies behind reverse proxies

  // 🔒 1. Security Headers via Helmet (CSP, HSTS, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows serving proxied images
    }),
  );

  // 🔒 2. Request body size limit to mitigate payload-based DoS
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // 🔒 3. Cookie Parser for HttpOnly cookie auth
  app.use(cookieParser());

  // 🔒 4. Tightened CORS configuration
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    /^https:\/\/.*\.onrender\.com$/,
    ...envOrigins,
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Universal Recovery System Backend listening on port ${port}`);
}

bootstrap();