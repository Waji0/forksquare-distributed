// import { Router } from 'express';
// import {
//   getDashboard,
//   getAllRestaurants,
//   createRestaurant,
//   updateRestaurant,
//   deleteRestaurant,
//   getAllOrders,
//   getInventory,
//   updateInventory,
// } from '../controllers/admin.controller';
// import { authenticateToken } from '../middlewares/auth';

// const router = Router();

// // All admin routes require authentication
// router.use(authenticateToken);

// router.get('/dashboard', getDashboard);
// router.get('/restaurants', getAllRestaurants);
// router.post('/restaurants', createRestaurant);
// router.patch('/restaurants/:id', updateRestaurant);
// router.delete('/restaurants/:id', deleteRestaurant);
// router.get('/orders', getAllOrders);
// router.get('/inventory', getInventory);
// router.patch('/inventory/:itemId', updateInventory);

// export default router;


import { Router } from 'express';
import {
  getDashboard,
  getAllRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getAllOrders,
  getInventory,
  updateInventory,
} from '../controllers/admin.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/rbac';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/restaurants', getAllRestaurants);
router.post('/restaurants', createRestaurant);
router.patch('/restaurants/:id', updateRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);
router.get('/orders', getAllOrders);
router.get('/inventory', getInventory);
router.patch('/inventory/:itemId', updateInventory);

export default router;