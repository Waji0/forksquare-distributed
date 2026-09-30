import { Router } from 'express';
import { getTopology, routeOrder, routeRestaurant, getDistribution } from '../controllers/shardRouter.controller';

const router = Router();

router.get('/topology', getTopology);
router.get('/route-order', routeOrder);
router.get('/route-restaurant', routeRestaurant);
router.get('/distribution', getDistribution);

export default router;