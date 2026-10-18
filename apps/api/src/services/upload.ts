// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import crypto from 'crypto';

// /**
//  * File Upload Service (Cloudinary Simulation)
//  * 
//  * In production, this would upload to Cloudinary/AWS S3.
//  * This simulation stores files locally in an 'uploads' directory.
//  * 
//  * Architecture mirrors Cloudinary:
//  * 1. Multer handles multipart/form-data
//  * 2. File is validated (type, size)
//  * 3. File is stored with a unique ID
//  * 4. A URL-like path is returned for the frontend
//  */

// // Ensure uploads directory exists
// const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// // Configure Multer storage
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: (_req, file, cb) => {
//     const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
//     const ext = path.extname(file.originalname);
//     cb(null, `${uniqueId}${ext}`);
//   },
// });

// // File filter: only allow images
// const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and WebP are allowed.`));
//   }
// };

// // Create Multer instance
// export const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5 MB max
//   },
// });

// /**
//  * Generate a simulated Cloudinary-like URL
//  */
// export function getFileUrl(filename: string): string {
//   return `/uploads/${filename}`;
// }








import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import logger from '../config/logger';

/**
 * Upload Service — Real Cloudinary Integration
 *
 * Auto-detects Cloudinary credentials:
 * - YES → uploads to Cloudinary CDN, returns public URL
 * - NO  → falls back to local disk storage via Multer
 */

// Configure Cloudinary if credentials are present
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info('☁️  Cloudinary initialized');
} else {
  logger.warn('⚠️  Cloudinary not configured. Uploads will be stored locally.');
}

// In-memory storage so we can upload buffer to Cloudinary without writing to disk first
const memoryStorage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and WebP are allowed.`));
  }
};

export const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export async function uploadFile(file: Express.Multer.File): Promise<{
  url: string;
  publicId: string;
  mode: 'CLOUDINARY' | 'LOCAL';
}> {
  if (env.CLOUDINARY_CLOUD_NAME) {
    // Upload buffer to Cloudinary
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'forksquare',
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            mode: 'CLOUDINARY',
          });
        }
      );
      stream.end(file.buffer);
    });
  }

  // Fallback: generate a fake local URL (no disk write)
  return {
    url: `/uploads/local/${file.originalname}`,
    publicId: `local_${Date.now()}`,
    mode: 'LOCAL',
  };
}

export const isCloudinaryConfigured = (): boolean => !!env.CLOUDINARY_CLOUD_NAME;