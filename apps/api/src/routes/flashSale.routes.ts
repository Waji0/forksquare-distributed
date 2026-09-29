import { Router } from 'express';
import { buyFlashSaleItem, getFlashSaleStatus } from '../controllers/flashSale.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/buy', authenticateToken, buyFlashSaleItem);
router.get('/status/:itemId', getFlashSaleStatus); // Status is public

export default router;