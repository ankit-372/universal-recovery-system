import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin', // Match docker-compose
  secretKey: 'minioadmin',
});

// Helper to ensure bucket exists
export const initBucket = async () => {
  const bucketName = 'lost-items';
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(`🪣 Bucket '${bucketName}' created.`);
  }
};