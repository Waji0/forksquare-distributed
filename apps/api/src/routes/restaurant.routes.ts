// import { Router } from 'express';
// import {
//   // getRestaurants,
//   getAllRestaurants,
//   getRestaurantById,
//   createRestaurant,
// } from '../controllers/restaurant.controller';

// const router = Router();

// // router.get('/', getRestaurants);
// router.get('/', getAllRestaurants);
// router.get('/:id', getRestaurantById);
// router.post('/', createRestaurant);

// export default router;




import { Router } from 'express';
import { 
  getAllRestaurants, 
  getRestaurantById, 
  createRestaurant,
  searchRestaurants 
} from '../controllers/restaurant.controller';
import { authenticateToken } from '../middlewares/auth';
import { upload } from '../services/upload';

const router = Router();

// Public routes
router.get('/', getAllRestaurants);
router.get('/search', searchRestaurants);
router.get('/:id', getRestaurantById);

// Protected route: Middleware order matters! authenticateToken -> upload -> controller
router.post('/', authenticateToken, upload.single('imageFile'), createRestaurant);

export default router;