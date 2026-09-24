import { Router } from 'express';
import authRoutes from './auth.routes';
import restaurantRoutes from './restaurant.routes';
import orderRoutes from './order.routes';
import systemRoutes from './system.routes';
import flashSaleRoutes from './flashSale.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/orders', orderRoutes);
router.use('/system', systemRoutes);
router.use('/flash-sale', flashSaleRoutes);

export default router;