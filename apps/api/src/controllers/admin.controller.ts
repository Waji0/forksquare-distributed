import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../middlewares/errorHandler';

const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  cuisine: z.string().min(2),
  category: z.string().min(2),
  rating: z.number().min(0).max(5).optional(),
  deliveryTime: z.string().min(1),
  deliveryFee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  emoji: z.string().optional(),
  gradient: z.string().optional(),
  featured: z.boolean().optional(),
});

const updateRestaurantSchema = createRestaurantSchema.partial();

// ==========================================
// GET /api/admin/dashboard
// ==========================================
export async function getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalOrders,
      totalUsers,
      totalRestaurants,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      pgPool.query('SELECT COUNT(*) as count FROM orders'),
      pgPool.query('SELECT COUNT(*) as count FROM users'),
      Restaurant.countDocuments(),
      pgPool.query('SELECT id, user_id, status, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 10'),
      pgPool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC'),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: Number(totalOrders.rows[0].count),
          totalUsers: Number(totalUsers.rows[0].count),
          totalRestaurants,
        },
        recentOrders: recentOrders.rows,
        ordersByStatus: ordersByStatus.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/admin/restaurants
// ==========================================
export async function getAllRestaurants(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: restaurants, total: restaurants.length });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/admin/restaurants
// ==========================================
export async function createRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');

    const restaurant = await Restaurant.create(parsed.data);
    res.status(201).json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// PATCH /api/admin/restaurants/:id
// ==========================================
export async function updateRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateRestaurantSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'Validation failed');

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE /api/admin/restaurants/:id
// ==========================================
export async function deleteRestaurant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    res.json({ success: true, message: `Restaurant '${restaurant.name}' deleted` });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/admin/orders
// ==========================================
export async function getAllOrders(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pgPool.query(
      `SELECT o.id, o.user_id, u.username, o.status, o.total_amount, o.created_at
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/admin/inventory
// ==========================================
export async function getInventory(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pgPool.query(
      'SELECT item_id, quantity, version FROM inventory ORDER BY quantity ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// PATCH /api/admin/inventory/:itemId
// ==========================================
export async function updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      throw new ApiError(400, 'quantity must be a non-negative number');
    }

    const result = await pgPool.query(
      'UPDATE inventory SET quantity = $1, version = version + 1 WHERE item_id = $2 RETURNING *',
      [quantity, itemId]
    );

    if (result.rows.length === 0) throw new ApiError(404, 'Inventory item not found');

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}