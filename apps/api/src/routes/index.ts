import { Router } from 'express';
import authRoutes from './auth.routes';
import restaurantRoutes from './restaurant.routes';
import orderRoutes from './order.routes';
import systemRoutes from './system.routes';
import flashSaleRoutes from './flashSale.routes';
import eventRoutes from './event.routes';
import similarRoutes from './similar.routes';
import analyticsRoutes from './analytics.routes';
import graphRoutes from './graph.routes';
import hashRingRoutes from './hashRing.routes';
import vectorClockRoutes from './vectorClock.routes';

import shardRoutes from './shard.routes';
import commitProtocolRoutes from './commitProtocol.routes';



const router = Router();

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/orders', orderRoutes);
router.use('/system', systemRoutes);
router.use('/flash-sale', flashSaleRoutes);
router.use('/events', eventRoutes);
router.use('/similar', similarRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/graph', graphRoutes);
router.use('/hash-ring', hashRingRoutes);
router.use('/vector-clock', vectorClockRoutes);

router.use('/shards', shardRoutes);
router.use('/commit-protocols', commitProtocolRoutes);

export default router;