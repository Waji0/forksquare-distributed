import { redisClient } from '../config/db';
import crypto from 'crypto';

/**
 * Distributed Lock using Redis
 * 
 * Course Mapping: Week 11 - Distributed Concurrency Control
 * 
 * We use a Lua script to ensure the lock release is ATOMIC.
 * This prevents a node from accidentally releasing a lock that 
 * was already expired and acquired by another node.
 */

const LOCK_PREFIX = 'forksquare:lock:';

// Lua script for atomic lock release
const UNLOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export interface Lock {
  key: string;
  token: string;
  release: () => Promise<void>;
}

/**
 * Acquire a distributed lock
 * @param resource The resource to lock (e.g., 'flash_sale_item_1')
 * @param ttlMs Time to live in milliseconds (prevents deadlocks if node crashes)
 */
export async function acquireLock(resource: string, ttlMs: number = 5000): Promise<Lock | null> {
  const key = LOCK_PREFIX + resource;
  const token = crypto.randomUUID(); // Unique identifier for this lock owner
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  // NX = Only set if Not eXists (atomic lock acquisition)
  // EX = Expire time in seconds
  const result = await redisClient.set(key, token, 'EX', ttlSeconds, 'NX');

  if (result === 'OK') {
    return {
      key,
      token,
      release: async () => {
        // Execute Lua script to safely release the lock
        await redisClient.eval(UNLOCK_SCRIPT, 1, key, token);
      },
    };
  }

  // Lock is already held by someone else
  return null;
}