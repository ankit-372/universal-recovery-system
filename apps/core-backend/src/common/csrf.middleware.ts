import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware:
 * For state-changing requests (POST, PUT, DELETE, PATCH),
 * validates Origin/Referer and checks for custom header (X-Requested-With)
 * to prevent simple cross-site form submissions when using credentials/cookies.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    if (!safeMethods.includes(req.method)) {
      const xRequestedWith = req.headers['x-requested-with'];
      const origin = req.headers['origin'] || req.headers['referer'];

      // Allow if custom header is present (browser cross-origin form POSTs cannot set custom headers without preflight)
      if (xRequestedWith === 'XMLHttpRequest') {
        return next();
      }

      // If no custom header, check that origin matches allowed frontend origins or host
      const host = req.headers['host'];
      if (origin && host) {
        try {
          const originUrl = new URL(Array.isArray(origin) ? origin[0] : origin);
          if (
            originUrl.host === host ||
            originUrl.hostname === 'localhost' ||
            originUrl.hostname === '127.0.0.1' ||
            originUrl.hostname.endsWith('.onrender.com')
          ) {
            return next();
          }
        } catch {
          // invalid origin format
        }
      }

      throw new ForbiddenException(
        'CSRF validation failed: Missing X-Requested-With header or untrusted Origin',
      );
    }

    next();
  }
}
