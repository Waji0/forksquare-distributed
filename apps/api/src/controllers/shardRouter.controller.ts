import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getOrderShard,
  getRestaurantShard,
  getShardTopology,
  simulateDistribution,
} from '../services/shardRouter';
import { ApiError } from '../middlewares/errorHandler';

const userIdSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'userId must be a number'),
});

const citySchema = z.object({
  city: z.string().min(1),
});

const distributionSchema = z.object({
  totalUsers: z.string().optional(),
});

// ==========================================
// GET /api/shards/topology
// ==========================================
export function getTopology(_req: Request, res: Response, _next: NextFunction): void {
  const topology = getShardTopology();

  res.json({
    success: true,
    data: topology,
    explanation: {
      hashPartitioning: 'Orders are distributed across 3 shards using MD5 hash of user_id. Formula: hash(user_id) % 3',
      rangePartitioning: 'Restaurants are distributed by city/region. Karachi → South, Lahore → North, etc.',
      horizontalFragmentation: 'Each shard contains a SUBSET of rows (horizontal slice)',
      verticalFragmentation: 'User PII (password) is in a separate table from public profile (vertical slice)',
    },
  });
}

// ==========================================
// GET /api/shards/route-order?userId=42
// ==========================================
export function routeOrder(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = userIdSchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, 'userId query parameter must be a number');

    const userId = Number(parsed.data.userId);
    const shard = getOrderShard(userId);

    res.json({
      success: true,
      data: {
        userId,
        assignedShard: shard.shardId,
        postgresSchema: shard.postgresSchema,
        partitionStrategy: 'HASH',
        hashFunction: 'MD5(user_id) % 3',
      },
      explanation: `User ${userId}'s orders will be stored in PostgreSQL schema '${shard.postgresSchema}'. This ensures all orders for a single user are co-located on the same shard for fast queries.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/shards/route-restaurant?city=karachi
// ==========================================
export function routeRestaurant(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = citySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, 'city query parameter is required');

    const { city } = parsed.data;
    const shard = getRestaurantShard(city);

    res.json({
      success: true,
      data: {
        city,
        assignedShard: shard.shardId,
        mongoCollection: shard.mongoCollection,
        partitionStrategy: 'RANGE',
        rangeKey: 'city/region',
      },
      explanation: `Restaurants in '${city}' are stored in MongoDB collection '${shard.mongoCollection}'. Range partitioning by geography ensures nearby restaurants are co-located for fast geo-queries.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/shards/distribution?totalUsers=1000
// ==========================================
export function getDistribution(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = distributionSchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, 'Invalid parameters');

    const totalUsers = Math.min(100000, Math.max(1, Number(parsed.data.totalUsers) || 1000));
    const distribution = simulateDistribution(totalUsers);

    const values = Object.values(distribution);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const balanceRatio = min > 0 ? (max / min).toFixed(3) : 'N/A';

    res.json({
      success: true,
      data: {
        totalUsers,
        distribution,
        balanceRatio,
        isBalanced: Number(balanceRatio) < 1.1,
      },
      explanation: `With ${totalUsers} users distributed across 3 shards using hash partitioning, the balance ratio is ${balanceRatio}. A ratio of 1.0 means perfect distribution. Ratios below 1.1 are considered well-balanced.`,
    });
  } catch (error) {
    next(error);
  }
}