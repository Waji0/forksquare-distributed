import { Router } from 'express';
import { updateOrderStatus, getOrderTracking, getValidTransitions } from '../controllers/orderTracking.controller';

const router = Router();

router.get('/valid-transitions', getValidTransitions);
router.get('/:orderId', getOrderTracking);
router.patch('/:orderId/status', updateOrderStatus);

export default router;