import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private sessionService: SessionService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Single-device session creation: generates a new sessionId and invalidates any previous
    const sessionId = await this.sessionService.createSession(user.id);
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.fullName,
      sid: sessionId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async logout(userId: string) {
    if (userId) {
      await this.sessionService.revokeSession(userId);
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    // Generic response to prevent email enumeration
    if (!user) return { message: 'If email exists, reset link sent.' };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Hash the token before storing in PostgreSQL to prevent leak exploitation
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.usersService.setResetToken(user.id, hashedToken, expires);
    // Send raw unhashed token via email
    await this.emailService.sendResetEmail(user.email, rawToken);

    return { message: 'If email exists, reset link sent.' };
  }

  async resetPassword(token: string, newPass: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    // Hash token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.usersService.updatePasswordAndClearToken(user.id, hashedPassword);

    // Invalidate any active sessions after password change
    await this.sessionService.revokeSession(user.id);

    return { message: 'Password reset successful. Please login.' };
  }
}