import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';

const addToCartSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  restaurantName: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  price: z.number().positive(),
});

const updateCartSchema = z.object({
  quantity: z.number().int().positive(),
});

// ==========================================
// GET /api/cart
// ==========================================
export async function getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const result = await pgPool.query(
      `SELECT id, item_id, item_name, restaurant_name, quantity, price, added_at
       FROM cart_items
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    const items = result.rows;
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0
    );
    const totalItems = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    res.json({
      success: true,
      data: {
        items,
        summary: {
          totalItems,
          totalAmount: Number(totalAmount.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/cart
// ==========================================
export async function addToCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const parsed = addToCartSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');

    const { itemId, itemName, restaurantName, quantity, price } = parsed.data;

    // UPSERT: If item already in cart, increment quantity
    const result = await pgPool.query(
      `INSERT INTO cart_items (user_id, item_id, item_name, restaurant_name, quantity, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, item_id)
       DO UPDATE SET quantity = cart_items.quantity + $5
       RETURNING *`,
      [userId, itemId, itemName, restaurantName, quantity, price]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `${itemName} added to cart`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// PATCH /api/cart/:itemId
// ==========================================
export async function updateCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const { itemId } = req.params;
    const parsed = updateCartSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'quantity must be a positive integer');

    const result = await pgPool.query(
      `UPDATE cart_items SET quantity = $1
       WHERE user_id = $2 AND item_id = $3
       RETURNING *`,
      [parsed.data.quantity, userId, itemId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Cart item not found');
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cart item updated',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE /api/cart/:itemId
// ==========================================
export async function removeFromCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    const { itemId } = req.params;

    const result = await pgPool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND item_id = $2 RETURNING item_name',
      [userId, itemId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Cart item not found');
    }

    res.json({
      success: true,
      message: `${result.rows[0].item_name} removed from cart`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE /api/cart/clear
// ==========================================
export async function clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    await pgPool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/cart/checkout
// ==========================================
/**
 * Converts cart items into an order and clears the cart.
 * This bridges the Cart → Order flow that was missing.
 */
export async function checkoutCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Authentication required');

    // Get cart items
    const cartResult = await pgPool.query(
      'SELECT item_id, item_name, quantity, price FROM cart_items WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      throw new ApiError(400, 'Cart is empty. Add items before checkout.');
    }

    const totalAmount = cartResult.rows.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0
    );

    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, status, total_amount)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, status, total_amount, created_at`,
        [userId, 'PENDING', totalAmount]
      );

      const order = orderResult.rows[0];

      // Add initial status to tracking history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, note)
         VALUES ($1, $2, $3)`,
        [order.id, 'PENDING', 'Order placed successfully']
      );

      // Deduct inventory for each cart item
      for (const item of cartResult.rows) {
        await client.query(
          `UPDATE inventory SET quantity = quantity - $1, version = version + 1
           WHERE item_id = $2 AND quantity >= $1`,
          [item.quantity, item.item_id]
        );
      }

      // Clear cart
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          totalAmount: Number(Number(order.total_amount).toFixed(2)),
          itemCount: cartResult.rows.length,
        },
        message: 'Order placed successfully! Cart has been cleared.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}