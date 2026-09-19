import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../middlewares/errorHandler';

// ==========================================
// Zod Schema
// ==========================================
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

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['rating', 'name', 'deliveryTime']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ==========================================
// GET /api/restaurants
// ==========================================
export async function getRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, 'Invalid query parameters');
    }

    const { search, category, sortBy, sortOrder, page, limit } = parsed.data;

    // Build MongoDB query
    const filter: Record<string, unknown> = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { cuisine: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};

    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.rating = -1;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Restaurant.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/restaurants/:id
// ==========================================
export async function getRestaurantById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id).lean();

    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    res.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/restaurants
// ==========================================
export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const restaurant = await Restaurant.create(parsed.data);

    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
}