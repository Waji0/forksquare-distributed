import { Router } from 'express';
import { 
  getMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem 
} from '../controllers/menu.controller';
import { authenticateToken } from '../middlewares/auth';
import { upload } from '../services/upload';

const router = Router();

// All menu routes require authentication
router.use(authenticateToken);

router.get('/:restaurantId', getMenuItems);
router.post('/:restaurantId', upload.single('imageFile'), createMenuItem);
router.put('/:restaurantId/:menuId', upload.single('imageFile'), updateMenuItem);
router.delete('/:restaurantId/:menuId', deleteMenuItem);

export default router;