import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { ChatModule } from './chat/chat.module'; // <--- 1. Import ChatModule

@Module({
  imports: [
    // 1. Load .env variables
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Connect to Postgres
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'), // Full connection string if on Render
        host: config.get<string>('DB_HOST') || 'localhost', // Fallback for local Docker
        port: config.get<number>('DB_PORT') || 5432,
        username: config.get<string>('DB_USERNAME') || 'postgres',
        password: config.get<string>('DB_PASSWORD') || 'postgres',
        database: config.get<string>('DB_NAME') || 'postgres',
        autoLoadEntities: true,
        synchronize: true, // ⚠️ Only for dev! (Auto-creates tables)
      }),
    }),

    UsersModule,
    AuthModule,
    ItemsModule,
    ChatModule, // <--- 2. Add to Imports array
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}