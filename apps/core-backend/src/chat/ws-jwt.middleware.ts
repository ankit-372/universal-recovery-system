import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as cookie from 'cookie';
import { SessionService } from '../auth/session.service';

/**
 * Socket.IO middleware that authenticates the client via JWT:
 *   1. client.handshake.auth.token
 *   2. client.handshake.headers.cookie -> 'jwt' cookie
 *   3. client.handshake.query.token (fallback for ws clients unable to send auth/cookie)
 *
 * Attaches client.data.user = { id, email, name }
 */
export function createWsJwtMiddleware(
  jwtService: JwtService,
  configService: ConfigService,
  sessionService?: SessionService,
) {
  return async (client: Socket, next: (err?: Error) => void) => {
    try {
      let token: string | undefined;

      // 1. Handshake auth payload (e.g. io({ auth: { token } }))
      if (client.handshake.auth && client.handshake.auth.token) {
        token = client.handshake.auth.token;
      }

      // 2. Cookie header
      if (!token && client.handshake.headers.cookie) {
        const cookies = cookie.parse(client.handshake.headers.cookie);
        token = cookies['jwt'];
      }

      // 3. Query param token
      if (!token && client.handshake.query?.token) {
        token = client.handshake.query.token as string;
      }

      if (!token) {
        return next(new Error('Authentication required: No JWT provided'));
      }

      const secret = configService.get<string>('JWT_SECRET');
      if (!secret) {
        return next(new Error('Server configuration error: Missing JWT_SECRET'));
      }

      const payload = jwtService.verify(token, { secret });

      // If session service is provided, check if the session is still active
      if (sessionService && payload.sid) {
        const isValid = await sessionService.validateSession(payload.sub, payload.sid);
        if (!isValid) {
          return next(new Error('Session has expired or was revoked'));
        }
      }

      // Attach authenticated identity to socket
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };

      next();
    } catch (err: any) {
      next(new Error(`Authentication failed: ${err.message || 'Invalid token'}`));
    }
  };
}
