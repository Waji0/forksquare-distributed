import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller';
import { upload } from '../services/upload';

const router = Router();

// Multer middleware handles the file upload
router.post('/image', upload.single('image'), uploadImage);

export default router;