import { Router } from 'express';
import { createOrder, getOrders, getOrderById } from '../controllers/order.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All order routes now require authentication
router.post('/', authenticateToken, createOrder);
router.get('/', authenticateToken, getOrders);
router.get('/:id', authenticateToken, getOrderById);

export default router;