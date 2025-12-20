import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { UsersService } from '../users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { EmailService } from './email.service';

import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule, // We use the exported UsersService from here
    PassportModule,
    // TypeOrmModule.forFeature([User]), // ❌ Removed: UsersService handles DB access
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'DEV_SECRET_KEY',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService], // ❌ Removed UsersService from here (it's imported)
  exports: [AuthService, JwtStrategy, PassportModule]
})
export class AuthModule { }