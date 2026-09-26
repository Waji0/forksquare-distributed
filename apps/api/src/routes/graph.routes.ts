import { Router } from 'express';
import { getGraph, getRestaurantsByCuisine } from '../controllers/graph.controller';

const router = Router();

router.get('/', getGraph);
router.get('/by-cuisine', getRestaurantsByCuisine);

export default router;