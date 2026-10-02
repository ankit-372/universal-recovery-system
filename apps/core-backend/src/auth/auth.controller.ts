import { Controller, Post, Body, Res, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  // 🛡️ Rate limit: Max 5 attempts per minute to mitigate credential stuffing/brute force
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    // 1. Validate User (Check email/password)
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Generate Token with Session ID
    const { access_token } = await this.authService.login(user);

    // 3. Set HttpOnly Cookie
    res.cookie('jwt', access_token, {
      httpOnly: true,  // 🔒 JavaScript cannot read this (Prevents XSS)
      secure: true,    // MUST be true for cross-site cookies in production
      sameSite: 'none', // MUST be 'none' for independent frontend/backend domains
      maxAge: 3600 * 1000, // 1 hour expiration
    });

    // 4. Return success message
    return {
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.fullName }
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // 1. Extract token to identify user and revoke server-side session
    const token = req.cookies?.['jwt'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (token) {
      try {
        const decoded: any = this.jwtService.decode(token);
        if (decoded?.sub) {
          await this.authService.logout(decoded.sub);
        }
      } catch {
        // ignore decode failure on logout
      }
    }

    // 2. Clear cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = req.user.id || req.user.sub || req.user.userId;
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return the user (without password)
    const { passwordHash, ...result } = user;
    return result;
  }

  // 🛡️ Rate limit: Max 3 requests per minute to prevent email spamming/enumeration
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  // 🛡️ Rate limit: Max 5 attempts per minute to prevent token brute force
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPass: string }) {
    return this.authService.resetPassword(body.token, body.newPass);
  }
}