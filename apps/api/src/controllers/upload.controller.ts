import { Request, Response, NextFunction } from 'express';
import { getFileUrl } from '../services/upload';
import { ApiError } from '../middlewares/errorHandler';

// POST /api/upload/image
export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded. Please send a file with field name "image".');
    }

    const file = req.file;

    res.status(201).json({
      success: true,
      data: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        url: getFileUrl(file.filename),
        fullPath: file.path,
      },
      explanation: 'In production, this file would be uploaded to Cloudinary/AWS S3 and a CDN URL would be returned. This simulation stores it locally.',
    });
  } catch (error) {
    next(error);
  }
}