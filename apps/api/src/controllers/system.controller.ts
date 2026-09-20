import { Request, Response, NextFunction } from 'express';
import { cacheGetStats, cacheResetStats } from '../services/cache';
import { bloomStats } from '../services/bloomFilter';
import { redisClient } from '../config/db';

// ==========================================
// GET /api/system/stats
// ==========================================
export async function getSystemStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [cacheStats, bloomInfo, redisInfo] = await Promise.all([
      cacheGetStats(),
      bloomStats(),
      redisClient.info('memory'),
    ]);

    // Parse Redis memory usage
    const memoryMatch = redisInfo.match(/used_memory_human:(\S+)/);
    const redisMemory = memoryMatch ? memoryMatch[1] : 'unknown';

    res.json({
      success: true,
      data: {
        cache: cacheStats,
        bloomFilter: bloomInfo,
        redis: {
          memoryUsage: redisMemory,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/system/stats/reset
// ==========================================
export async function resetSystemStats(_req: Request, res: Response, next: NextFunction) {
  try {
    await cacheResetStats();

    res.json({
      success: true,
      message: 'Cache statistics reset successfully',
    });
  } catch (error) {
    next(error);
  }
}