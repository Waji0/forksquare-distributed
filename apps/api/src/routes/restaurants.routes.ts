// import { Router } from 'express';
// import { 
//   getAllRestaurants, 
//   getRestaurantById, 
//   createRestaurant,
//   searchRestaurants 
// } from '../controllers/restaurant.controller';
// import { authenticateToken } from '../middlewares/auth';
// import { upload } from '../services/upload';

// const router = Router();

// // Public routes
// router.get('/', getAllRestaurants);
// router.get('/search', searchRestaurants);
// router.get('/:id', getRestaurantById);

// // Protected routes (require authentication)
// router.post('/', authenticateToken, upload.single('imageFile'), createRestaurant);

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

// Protected routes (require authentication)
router.post('/', authenticateToken, upload.single('imageFile'), createRestaurant);

export default router;