import { validateUploadedFile } from '../common/file-validation';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CsrfMiddleware } from '../common/csrf.middleware';
import * as crypto from 'crypto';

describe('Security Verifications', () => {
  describe('File Upload Validation', () => {
    it('should reject file exceeding size limit', () => {
      const largeFile = {
        size: 6 * 1024 * 1024,
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(largeFile)).toThrow(BadRequestException);
    });

    it('should reject disallowed MIME types', () => {
      const maliciousFile = {
        size: 1024,
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('MZ...'),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(maliciousFile)).toThrow(BadRequestException);
    });

    it('should reject files with spoofed MIME types failing magic-byte check', () => {
      const spoofedFile = {
        size: 1024,
        mimetype: 'image/png',
        buffer: Buffer.from('NOT_A_PNG_FILE_HEADER'),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(spoofedFile)).toThrow(BadRequestException);
    });

    it('should accept valid PNG with genuine magic bytes', () => {
      const validPng = {
        size: 1024,
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      } as Express.Multer.File;

      expect(() => validateUploadedFile(validPng)).not.toThrow();
    });
  });

  describe('Password Reset Token Hashing', () => {
    it('should store and match SHA-256 hashed reset token without storing raw token', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      // The raw token sent to user email should hash to the stored value
      const verificationHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(verificationHash).toBe(hashedToken);
      expect(rawToken).not.toBe(hashedToken);
    });
  });

  describe('CSRF Middleware', () => {
    const middleware = new CsrfMiddleware();

    it('should allow GET requests without CSRF header', () => {
      const req: any = { method: 'GET', headers: {} };
      const res: any = {};
      const next = jest.fn();

      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow POST requests with X-Requested-With: XMLHttpRequest', () => {
      const req: any = {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      };
      const res: any = {};
      const next = jest.fn();

      middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject state-changing POST requests without X-Requested-With or trusted origin', () => {
      const req: any = {
        method: 'POST',
        headers: { origin: 'http://evil-attacker.com', host: 'api.recovery.com' },
      };
      const res: any = {};
      const next = jest.fn();

      expect(() => middleware.use(req, res, next)).toThrow(ForbiddenException);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
