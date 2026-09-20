import { redisClient } from '../config/db';

/**
 * Redis Cache Service
 * 
 * Course Mapping: Week 6 - Search routing & caching
 * 
 * Strategy: Cache-Aside Pattern
 * 1. Check cache first
 * 2. If hit → return cached data
 * 3. If miss → query DB → store in cache → return
 * 4. On write → invalidate related cache entries
 */

const CACHE_PREFIX = 'forksquare:cache:';
const DEFAULT_TTL = 60; // 60 seconds
const CACHE_STATS_KEY = 'forksquare:cache:stats';

interface CacheStats {
  hits: number;
  misses: number;
}

/**
 * Generate a cache key from parameters
 */
function buildCacheKey(...parts: string[]): string {
  return CACHE_PREFIX + parts.join(':');
}

/**
 * Get value from cache
 * Returns null if not found (cache miss)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const fullKey = buildCacheKey(key);
    const cached = await redisClient.get(fullKey);

    if (cached !== null) {
      // Track cache hit
      await redisClient.hincrby(CACHE_STATS_KEY, 'hits', 1);
      return JSON.parse(cached) as T;
    }

    // Track cache miss
    await redisClient.hincrby(CACHE_STATS_KEY, 'misses', 1);
    return null;
  } catch {
    return null;
  }
}

/**
 * Store value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  try {
    const fullKey = buildCacheKey(key);
    const serialized = JSON.stringify(value);
    await redisClient.setex(fullKey, ttlSeconds, serialized);
  } catch {
    // Cache write failure should not break the application
  }
}

/**
 * Invalidate cache entries matching a pattern
 * Called when data is modified (write-through invalidation)
 */
export async function cacheInvalidate(pattern: string): Promise<number> {
  try {
    const fullPattern = buildCacheKey(pattern);
    const keys = await redisClient.keys(fullPattern);

    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    return keys.length;
  } catch {
    return 0;
  }
}

/**
 * Get cache statistics (hit/miss ratio)
 */
export async function cacheGetStats(): Promise<CacheStats & { hitRatio: string }> {
  const stats = await redisClient.hgetall(CACHE_STATS_KEY);
  const hits = Number(stats.hits ?? 0);
  const misses = Number(stats.misses ?? 0);
  const total = hits + misses;
  const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : 'N/A';

  return { hits, misses, hitRatio };
}

/**
 * Reset cache statistics
 */
export async function cacheResetStats(): Promise<void> {
  await redisClient.del(CACHE_STATS_KEY);
}

/**
 * Flush all ForkSquare cache entries
 */
export async function cacheFlushAll(): Promise<void> {
  const keys = await redisClient.keys(CACHE_PREFIX + '*');
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}