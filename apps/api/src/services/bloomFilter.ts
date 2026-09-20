import { redisClient } from '../config/db';

/**
 * Bloom Filter Implementation using Redis Bit Array
 * 
 * Course Mapping: Week 6 - "bloom filters for key lookups"
 * Instructor Requirement: "handle username existence in constant time"
 * 
 * A Bloom filter is a space-efficient probabilistic data structure that
 * answers: "Is this element in the set?"
 * 
 * - If it says NO → the element is DEFINITELY not in the set (100% accurate)
 * - If it says YES → the element MIGHT be in the set (small false positive rate)
 * 
 * Time Complexity: O(k) where k = number of hash functions (constant)
 * Space Complexity: O(m) where m = bit array size
 */

const BLOOM_KEY = 'forksquare:bloom:usernames';
const BIT_SIZE = 100000; // 100k bits (~12.5 KB)
const NUM_HASHES = 5;    // 5 hash functions → ~0.01% false positive rate for 1000 items

/**
 * FNV-1a Hash Function (Fast Non-Cryptographic Hash)
 * We use this instead of crypto hashes because:
 * 1. It's deterministic (same input → same output)
 * 2. It's extremely fast (important for O(1) lookups)
 * 3. We don't need cryptographic security here
 */
function fnv1aHash(str: string, seed: number): number {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Ensure positive value within bit array bounds
  return Math.abs(hash) % BIT_SIZE;
}

/**
 * Generate multiple hash positions for the Bloom filter
 * Each hash function uses a different seed to produce independent positions
 */
function getHashPositions(value: string): number[] {
  const positions: number[] = [];
  for (let i = 0; i < NUM_HASHES; i++) {
    positions.push(fnv1aHash(value.toLowerCase().trim(), i * 7919));
  }
  return positions;
}

/**
 * Add a value to the Bloom filter
 * Called when a new user registers
 * 
 * Time: O(k) where k = NUM_HASHES = 5 (constant)
 */
export async function bloomAdd(value: string): Promise<void> {
  const positions = getHashPositions(value);
  const pipeline = redisClient.pipeline();

  for (const pos of positions) {
    pipeline.setbit(BLOOM_KEY, pos, 1);
  }

  await pipeline.exec();
}

/**
 * Check if a value MIGHT exist in the Bloom filter
 * Called before hitting PostgreSQL for username checks
 * 
 * Time: O(k) where k = NUM_HASHES = 5 (constant)
 * 
 * Returns:
 * - false → value DEFINITELY does not exist (skip DB query)
 * - true  → value MIGHT exist (need to verify with DB)
 */
export async function bloomMightContain(value: string): Promise<boolean> {
  const positions = getHashPositions(value);
  const pipeline = redisClient.pipeline();

  for (const pos of positions) {
    pipeline.getbit(BLOOM_KEY, pos);
  }

  const results = await pipeline.exec();

  // If ANY bit is 0, the value definitely does not exist
  for (const [, result] of results ?? []) {
    if (result === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Bulk add values to Bloom filter
 * Used during seeding or migration
 */
export async function bloomAddBulk(values: string[]): Promise<void> {
  const pipeline = redisClient.pipeline();

  for (const value of values) {
    const positions = getHashPositions(value);
    for (const pos of positions) {
      pipeline.setbit(BLOOM_KEY, pos, 1);
    }
  }

  await pipeline.exec();
}

/**
 * Get Bloom filter statistics
 */
export async function bloomStats(): Promise<{
  bitSize: number;
  numHashes: number;
  bitsSet: number;
  fillRatio: number;
}> {
  // Count set bits (approximation via STRLEN * 8 for simplicity)
  const bitCount = await redisClient.bitcount(BLOOM_KEY);

  return {
    bitSize: BIT_SIZE,
    numHashes: NUM_HASHES,
    bitsSet: bitCount,
    fillRatio: Number((bitCount / BIT_SIZE).toFixed(4)),
  };
}