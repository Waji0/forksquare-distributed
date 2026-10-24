import { Router } from 'express';
import { updateProfile } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

router.put('/profile', updateProfile);

export default router;