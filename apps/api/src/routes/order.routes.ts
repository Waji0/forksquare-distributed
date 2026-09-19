import { Router } from 'express';
import { createOrder, getOrders, getOrderById } from '../controllers/order.controller';

const router = Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

export default router;