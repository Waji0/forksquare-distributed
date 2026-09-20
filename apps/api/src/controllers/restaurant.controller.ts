import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../middlewares/errorHandler';
import { cacheGet, cacheSet, cacheInvalidate } from '../services/cache';

// ==========================================
// Zod Schemas
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
// GET /api/restaurants (with Redis Cache)
// ==========================================
/**
 * Cache-Aside Pattern:
 * 1. Check Redis cache first
 * 2. If cache HIT → return cached data (no DB query)
 * 3. If cache MISS → query MongoDB → store in Redis → return
 * 
 * This reduces MongoDB load under high traffic.
 * Course Mapping: Week 6 - Search routing & caching
 */
export async function getRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, 'Invalid query parameters');
    }

    const { search, category, sortBy, sortOrder, page, limit } = parsed.data;

    // Build cache key from query parameters
    const cacheKey = [
      'restaurants',
      category ?? 'all',
      search ?? 'none',
      sortBy ?? 'default',
      sortOrder ?? 'desc',
      page ?? '1',
      limit ?? '12',
    ].join(':');

    // Step 1: Check Redis Cache
    const cached = await cacheGet<{ restaurants: unknown[]; pagination: unknown }>(cacheKey);

    if (cached) {
      res.json({
        success: true,
        data: cached,
        source: 'cache',
      });
      return;
    }

    // Step 2: Cache MISS → Query MongoDB
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

    // Execute MongoDB query
    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Restaurant.countDocuments(filter),
    ]);

    const responseData = {
      restaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    // Step 3: Store in Redis Cache (TTL: 60 seconds)
    await cacheSet(cacheKey, responseData, 60);

    res.json({
      success: true,
      data: responseData,
      source: 'database',
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

    // Check cache first
    const cacheKey = `restaurant:${id}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);

    if (cached) {
      res.json({
        success: true,
        data: cached,
        source: 'cache',
      });
      return;
    }

    const restaurant = await Restaurant.findById(id).lean();

    if (!restaurant) {
      throw new ApiError(404, 'Restaurant not found');
    }

    // Cache for 120 seconds
    await cacheSet(cacheKey, restaurant, 120);

    res.json({
      success: true,
      data: restaurant,
      source: 'database',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/restaurants (with Cache Invalidation)
// ==========================================
/**
 * When a restaurant is created:
 * 1. Insert into MongoDB
 * 2. Invalidate all restaurant cache entries
 * 
 * This ensures subsequent reads get fresh data.
 * Course Mapping: Week 11 - Eventual consistency trade-off
 */
export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const restaurant = await Restaurant.create(parsed.data);

    // Invalidate all restaurant list caches
    const invalidatedCount = await cacheInvalidate('restaurants:*');

    res.status(201).json({
      success: true,
      data: restaurant,
      cacheInvalidated: invalidatedCount,
    });
  } catch (error) {
    next(error);
  }
}