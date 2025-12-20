import { Controller, Post, Body, Res, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service'; // <--- 1. Import UsersService
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) { }

  @Post('login')
  async login(@Body() req, @Res({ passthrough: true }) res: Response) {
    // 1. Validate User (Check email/password)
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Generate Token
    const { access_token } = await this.authService.login(user);

    // 3. Set HttpOnly Cookie
    res.cookie('jwt', access_token, {
      httpOnly: true,  // 🔒 JavaScript cannot read this (Prevents XSS)
      secure: false,   // ⚠️ Set to 'true' in Production (Requires HTTPS)
      sameSite: 'lax', // 🛡️ Helps prevent CSRF
      maxAge: 3600 * 1000, // 1 hour expiration
    });

    // 4. Return success message (Token is hidden in cookie, not in body)
    return {
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.fullName }
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear the cookie to log the user out
    res.clearCookie('jwt');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Req() req) {
    // 3. Fix: Don't just return req.user (token payload). Fetch the real DB user.
    const userId = req.user.id || req.user.sub || req.user.userId;
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return the user (without password)
    const { passwordHash, ...result } = user;
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPass: string }) {
    return this.authService.resetPassword(body.token, body.newPass);
  }
}