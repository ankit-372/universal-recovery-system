import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

// Cloudinary will automatically look for CLOUDINARY_URL process.env variable.
export const uploadToCloudinary = (fileBuffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (result) {
          resolve(result.secure_url);
        } else {
          console.error("Cloudinary upload failed", error);
          reject(error);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};
