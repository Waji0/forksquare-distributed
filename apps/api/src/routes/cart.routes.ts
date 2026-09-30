import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkoutCart,
} from '../controllers/cart.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All cart routes require authentication
router.use(authenticateToken);

router.get('/', getCart);
router.post('/', addToCart);
router.post('/checkout', checkoutCart);
router.delete('/clear', clearCart);
router.patch('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);

export default router;