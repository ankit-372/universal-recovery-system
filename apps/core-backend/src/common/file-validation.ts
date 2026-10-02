import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes for image formats
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from('RIFF')],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
};

export function validateUploadedFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  // 1. Size check
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  // 3. Magic byte verification
  if (file.buffer && file.buffer.length >= 8) {
    const signatures = MAGIC_BYTES[file.mimetype];
    if (signatures) {
      const header = file.buffer.subarray(0, 8);
      const matches = signatures.some((sig) => {
        if (file.mimetype === 'image/webp') {
          // RIFF....WEBP
          const isRiff = header.subarray(0, 4).equals(Buffer.from('RIFF'));
          const isWebp =
            file.buffer.length >= 12 &&
            file.buffer.subarray(8, 12).equals(Buffer.from('WEBP'));
          return isRiff && isWebp;
        }
        return header.subarray(0, sig.length).equals(sig);
      });

      if (!matches) {
        throw new BadRequestException(
          'File content does not match declared type (magic byte mismatch)',
        );
      }
    }
  }
}
