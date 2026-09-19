import { Router } from 'express';
import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
} from '../controllers/restaurant.controller';

const router = Router();

router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);
router.post('/', createRestaurant);

export default router;