import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { ChatModule } from './chat/chat.module';
import { CsrfMiddleware } from './common/csrf.middleware';

@Module({
  imports: [
    // 1. Load .env variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Global Rate Limiter: Default 60 requests per minute
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // 3. Connect to Postgres
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        return {
          type: 'postgres' as const,
          // Use DATABASE_URL if available (Render), otherwise use individual params (local Docker)
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('DB_HOST') || 'localhost',
                port: config.get<number>('DB_PORT') || 5432,
                username: config.get<string>('DB_USERNAME') || 'postgres',
                password: config.get<string>('DB_PASSWORD') || 'postgres',
                database: config.get<string>('DB_NAME') || 'postgres',
              }),
          autoLoadEntities: true,
          synchronize: !isProduction, // 🔒 Disabled in production to prevent unintended schema mutation/data loss
          // SSL required for Render's managed PostgreSQL
          ...(isProduction && {
            ssl: { rejectUnauthorized: false },
          }),
        };
      },
    }),

    UsersModule,
    AuthModule,
    ItemsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 🔒 Enable global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 🔒 Apply CSRF protection middleware across all API routes
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}