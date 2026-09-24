import { Router } from 'express';
import { buyFlashSaleItem, getFlashSaleStatus } from '../controllers/flashSale.controller';

const router = Router();

router.post('/buy', buyFlashSaleItem);
router.get('/status/:itemId', getFlashSaleStatus);

export default router;