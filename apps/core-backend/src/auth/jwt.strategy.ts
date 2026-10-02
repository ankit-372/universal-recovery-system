import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SessionService } from './session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private sessionService: SessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is missing. Security policy requires server to fail closed.',
      );
    }

    super({
      // Extract from HttpOnly Cookie first, with fallback to Bearer Auth Header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['jwt'];
          }
          return token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Check server-side session if sid exists in payload
    if (payload.sid) {
      const isValid = await this.sessionService.validateSession(payload.sub, payload.sid);
      if (!isValid) {
        throw new UnauthorizedException('Session has expired or was revoked. Please log in again.');
      }
    }

    // Attach user to Request (req.user)
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}

//completed