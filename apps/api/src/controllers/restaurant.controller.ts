// import { Request, Response, NextFunction } from 'express';
// import { z } from 'zod';
// import { Restaurant } from '../models/Restaurant';
// import { ApiError } from '../middlewares/errorHandler';
// import { cacheGet, cacheSet, cacheInvalidate } from '../services/cache';

// // ==========================================
// // Zod Schemas
// // ==========================================
// const createRestaurantSchema = z.object({
//   name: z.string().min(2).max(100),
//   cuisine: z.string().min(2),
//   category: z.string().min(2),
//   rating: z.number().min(0).max(5).optional(),
//   deliveryTime: z.string().min(1),
//   deliveryFee: z.string().optional(),
//   tags: z.array(z.string()).optional(),
//   emoji: z.string().optional(),
//   gradient: z.string().optional(),
//   featured: z.boolean().optional(),
// });

// const querySchema = z.object({
//   search: z.string().optional(),
//   category: z.string().optional(),
//   sortBy: z.enum(['rating', 'name', 'deliveryTime']).optional(),
//   sortOrder: z.enum(['asc', 'desc']).optional(),
//   page: z.string().optional(),
//   limit: z.string().optional(),
// });

// // ==========================================
// // GET /api/restaurants (with Redis Cache)
// // ==========================================
// /**
//  * Cache-Aside Pattern:
//  * 1. Check Redis cache first
//  * 2. If cache HIT → return cached data (no DB query)
//  * 3. If cache MISS → query MongoDB → store in Redis → return
//  * 
//  * This reduces MongoDB load under high traffic.
//  * Course Mapping: Week 6 - Search routing & caching
//  */
// export async function getRestaurants(req: Request, res: Response, next: NextFunction) {
//   try {
//     const parsed = querySchema.safeParse(req.query);

//     if (!parsed.success) {
//       throw new ApiError(400, 'Invalid query parameters');
//     }

//     const { search, category, sortBy, sortOrder, page, limit } = parsed.data;

//     // Build cache key from query parameters
//     const cacheKey = [
//       'restaurants',
//       category ?? 'all',
//       search ?? 'none',
//       sortBy ?? 'default',
//       sortOrder ?? 'desc',
//       page ?? '1',
//       limit ?? '12',
//     ].join(':');

//     // Step 1: Check Redis Cache
//     const cached = await cacheGet<{ restaurants: unknown[]; pagination: unknown }>(cacheKey);

//     if (cached) {
//       res.json({
//         success: true,
//         data: cached,
//         source: 'cache',
//       });
//       return;
//     }

//     // Step 2: Cache MISS → Query MongoDB
//     const filter: Record<string, unknown> = {};

//     if (category && category !== 'all') {
//       filter.category = category;
//     }

//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { cuisine: { $regex: search, $options: 'i' } },
//         { tags: { $regex: search, $options: 'i' } },
//       ];
//     }

//     // Build sort
//     const sort: Record<string, 1 | -1> = {};

//     if (sortBy) {
//       sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
//     } else {
//       sort.rating = -1;
//     }

//     // Pagination
//     const pageNum = Math.max(1, Number(page) || 1);
//     const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
//     const skip = (pageNum - 1) * limitNum;

//     // Execute MongoDB query
//     const [restaurants, total] = await Promise.all([
//       Restaurant.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
//       Restaurant.countDocuments(filter),
//     ]);

//     const responseData = {
//       restaurants,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         totalPages: Math.ceil(total / limitNum),
//       },
//     };

//     // Step 3: Store in Redis Cache (TTL: 60 seconds)
//     await cacheSet(cacheKey, responseData, 60);

//     res.json({
//       success: true,
//       data: responseData,
//       source: 'database',
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// // ==========================================
// // GET /api/restaurants/:id
// // ==========================================
// export async function getRestaurantById(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { id } = req.params;

//     // Check cache first
//     const cacheKey = `restaurant:${id}`;
//     const cached = await cacheGet<Record<string, unknown>>(cacheKey);

//     if (cached) {
//       res.json({
//         success: true,
//         data: cached,
//         source: 'cache',
//       });
//       return;
//     }

//     const restaurant = await Restaurant.findById(id).lean();

//     if (!restaurant) {
//       throw new ApiError(404, 'Restaurant not found');
//     }

//     // Cache for 120 seconds
//     await cacheSet(cacheKey, restaurant, 120);

//     res.json({
//       success: true,
//       data: restaurant,
//       source: 'database',
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// // ==========================================
// // POST /api/restaurants (with Cache Invalidation)
// // ==========================================
// /**
//  * When a restaurant is created:
//  * 1. Insert into MongoDB
//  * 2. Invalidate all restaurant cache entries
//  * 
//  * This ensures subsequent reads get fresh data.
//  * Course Mapping: Week 11 - Eventual consistency trade-off
//  */
// export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
//   try {
//     const parsed = createRestaurantSchema.safeParse(req.body);

//     if (!parsed.success) {
//       throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
//     }

//     const restaurant = await Restaurant.create(parsed.data);

//     // Invalidate all restaurant list caches
//     const invalidatedCount = await cacheInvalidate('restaurants:*');

//     res.status(201).json({
//       success: true,
//       data: restaurant,
//       cacheInvalidated: invalidatedCount,
//     });
//   } catch (error) {
//     next(error);
//   }
// }







// import { Request, Response, NextFunction } from 'express';
// import { z } from 'zod';
// import { Restaurant } from '../models/Restaurant';
// import { ApiError } from '../middlewares/errorHandler';
// import { uploadFile } from '../services/upload';
// import logger from '../config/logger';

// const createRestaurantSchema = z.object({
//   name: z.string().min(3).max(100),
//   cuisine: z.string().min(2).max(50),
//   category: z.string().min(2).max(30),
//   rating: z.coerce.number().min(0).max(5).optional().default(4.0),
//   deliveryTime: z.string().min(3).max(20),
//   deliveryFee: z.string().min(2).max(20),
//   tags: z.string().optional().default(''),
//   emoji: z.string().optional().default('🍽️'),
//   gradient: z.string().optional().default('from-orange-500 to-red-500'),
//   featured: z.coerce.boolean().optional().default(false),
// });

// export async function getAllRestaurants(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { page = '1', limit = '20', search, category, sortBy, sortOrder } = req.query;
    
//     const pageNum = parseInt(page as string, 10);
//     const limitNum = parseInt(limit as string, 10);
//     const skip = (pageNum - 1) * limitNum;

//     // Build query
//     const query: any = {};
//     if (search) {
//       query.$or = [
//         { name: { $regex: search as string, $options: 'i' } },
//         { cuisine: { $regex: search as string, $options: 'i' } },
//         { tags: { $regex: search as string, $options: 'i' } },
//       ];
//     }
//     if (category) {
//       query.category = category;
//     }

//     // Build sort
//     const sort: any = {};
//     if (sortBy) {
//       sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
//     } else {
//       sort.featured = -1;
//       sort.rating = -1;
//     }

//     const restaurants = await Restaurant.find(query)
//       .sort(sort)
//       .skip(skip)
//       .limit(limitNum);

//     const total = await Restaurant.countDocuments(query);

//     res.json({
//       success: true,
//       data: {
//         restaurants,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           totalPages: Math.ceil(total / limitNum),
//         },
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function searchRestaurants(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { q } = req.query;
//     if (!q || typeof q !== 'string') {
//       throw new ApiError(400, 'Search query parameter "q" is required');
//     }

//     const restaurants = await Restaurant.find({
//       $or: [
//         { name: { $regex: q, $options: 'i' } },
//         { cuisine: { $regex: q, $options: 'i' } },
//         { tags: { $regex: q, $options: 'i' } },
//         { category: { $regex: q, $options: 'i' } },
//       ],
//     }).limit(10);

//     res.json({
//       success: true,
//       data: { restaurants },
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function getRestaurantById(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { id } = req.params;
//     const restaurant = await Restaurant.findById(id);

//     if (!restaurant) {
//       throw new ApiError(404, 'Restaurant not found');
//     }

//     res.json({
//       success: true,
//       data: restaurant,
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
//   try {
//     const parsed = createRestaurantSchema.safeParse(req.body);
//     if (!parsed.success) {
//       throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
//     }

//     const userId = (req as any).user.userId;
//     const data = parsed.data;

//     // Handle image upload if provided
//     let imageUrl = '';
//     if (req.file) {
//       const uploadResult = await uploadFile(req.file);
//       imageUrl = uploadResult.url;
//     }

//     // Parse tags from comma-separated string
//     const tags = data.tags
//       ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
//       : [];

//     // Create restaurant
//     const restaurant = new Restaurant({
//       ...data,
//       tags,
//       imageUrl,
//       owner: userId,
//     });

//     await restaurant.save();

//     logger.info(`Restaurant created: ${restaurant.name} by user ${userId}`);

//     res.status(201).json({
//       success: true,
//       data: restaurant,
//       message: 'Restaurant created successfully',
//     });
//   } catch (error) {
//     next(error);
//   }
// }







import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../middlewares/errorHandler';
import { uploadFile } from '../services/upload';
import logger from '../config/logger';

// const createRestaurantSchema = z.object({
//   name: z.string().min(3).max(100),
//   cuisine: z.string().min(2).max(50),
//   category: z.string().min(2).max(30),
//   rating: z.coerce.number().min(0).max(5).optional().default(4.0),
//   deliveryTime: z.string().min(3).max(20),
//   deliveryFee: z.string().min(2).max(20),
//   tags: z.string().optional().default(''),
//   emoji: z.string().optional().default('🍽️'),
//   gradient: z.string().optional().default('from-orange-500 to-red-500'),
//   featured: z.coerce.boolean().optional().default(false),
// });

export async function getAllRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '20', search, category, sortBy, sortOrder } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { cuisine: { $regex: search as string, $options: 'i' } },
        { tags: { $regex: search as string, $options: 'i' } },
      ];
    }
    if (category) {
      query.category = category;
    }

    const sort: any = {};
    if (sortBy) {
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.featured = -1;
      sort.rating = -1;
    }

    const restaurants = await Restaurant.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Restaurant.countDocuments(query);

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

export async function searchRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      throw new ApiError(400, 'Search query parameter "q" is required');
    }

    const restaurants = await Restaurant.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ],
    }).limit(10);

    res.json({
      success: true,
      data: { restaurants },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRestaurantById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);

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

// export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
//   try {
//     const parsed = createRestaurantSchema.safeParse(req.body);
//     if (!parsed.success) {
//       throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
//     }

//     const userId = (req as any).user.userId;
//     const data = parsed.data;

//     let imageUrl = '';
//     if (req.file) {
//       const uploadResult = await uploadFile(req.file);
//       imageUrl = uploadResult.url;
//     }

//     const tags = data.tags
//       ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
//       : [];

//     const restaurant = new Restaurant({
//       ...data,
//       tags,
//       imageUrl,
//       owner: userId,
//     });

//     await restaurant.save();

//     logger.info(`Restaurant created: ${restaurant.name} by user ${userId}`);

//     res.status(201).json({
//       success: true,
//       data: restaurant,
//       message: 'Restaurant created successfully',
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
//   try {
//     // FormData sends everything as strings. We need to normalize booleans and numbers.
//     const rawBody = { ...req.body };
//     rawBody.featured = rawBody.featured === 'true' || rawBody.featured === true;
//     rawBody.rating = Number(rawBody.rating) || 4.0;

//     const createRestaurantSchema = z.object({
//       name: z.string().min(3, "Name must be at least 3 characters").max(100),
//       cuisine: z.string().min(2, "Cuisine is required").max(50),
//       category: z.string().min(2, "Category is required").max(30),
//       rating: z.number().min(0).max(5).optional().default(4.0),
//       deliveryTime: z.string().min(3, "Delivery time is required").max(20),
//       deliveryFee: z.string().min(2, "Delivery fee is required").max(20),
//       tags: z.string().optional().default(''),
//       emoji: z.string().optional().default('🍽️'),
//       gradient: z.string().optional().default('from-orange-500 to-red-500'),
//       featured: z.boolean().optional().default(false),
//     });

//     const parsed = createRestaurantSchema.safeParse(rawBody);
    
//     if (!parsed.success) {
//       // Extract specific field errors to show the user exactly what's wrong
//       const errors = parsed.error.errors.map(e => `${e.path[0]}: ${e.message}`).join('; ');
//       logger.warn(`Restaurant creation validation failed: ${errors}`);
//       throw new ApiError(400, errors);
//     }

//     const userId = (req as any).user.userId;
//     const data = parsed.data;

//     let imageUrl = '';
//     if (req.file) {
//       const uploadResult = await uploadFile(req.file);
//       imageUrl = uploadResult.url;
//     }

//     const tags = data.tags
//       ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
//       : [];

//     const restaurant = new Restaurant({
//       ...data,
//       tags,
//       imageUrl,
//       owner: userId,
//     });

//     await restaurant.save();

//     logger.info(`Restaurant created: ${restaurant.name} by user ${userId}`);

//     res.status(201).json({
//       success: true,
//       data: restaurant,
//       message: 'Restaurant created successfully',
//     });
//   } catch (error) {
//     next(error);
//   }
// }

export async function createRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Safely check if user is authenticated
    const user = (req as any).user;
    if (!user || !user.userId) {
      throw new ApiError(401, 'Authentication required. Please log in to create a restaurant.');
    }
    const userId = user.userId;

    // 2. Normalize FormData strings
    const rawBody = { ...req.body };
    rawBody.featured = rawBody.featured === 'true' || rawBody.featured === true;
    rawBody.rating = Number(rawBody.rating) || 4.0;

    const createRestaurantSchema = z.object({
      name: z.string().min(3, "Name must be at least 3 characters").max(100),
      cuisine: z.string().min(2, "Cuisine is required").max(50),
      category: z.string().min(2, "Category is required").max(30),
      rating: z.number().min(0).max(5).optional().default(4.0),
      deliveryTime: z.string().min(3, "Delivery time is required").max(20),
      deliveryFee: z.string().min(2, "Delivery fee is required").max(20),
      tags: z.string().optional().default(''),
      emoji: z.string().optional().default('🍽️'),
      gradient: z.string().optional().default('from-orange-500 to-red-500'),
      featured: z.boolean().optional().default(false),
    });

    const parsed = createRestaurantSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => `${e.path[0]}: ${e.message}`).join('; ');
      throw new ApiError(400, errors);
    }

    const data = parsed.data;

    let imageUrl = '';
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      imageUrl = uploadResult.url;
    }

    const tags = data.tags
      ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [];

    const restaurant = new Restaurant({
      ...data,
      tags,
      imageUrl,
      owner: userId,
    });

    await restaurant.save();

    logger.info(`Restaurant created: ${restaurant.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: restaurant,
      message: 'Restaurant created successfully',
    });
  } catch (error) {
    next(error);
  }
}