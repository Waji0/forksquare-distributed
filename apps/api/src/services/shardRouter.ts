import crypto from 'crypto';

/**
 * Shard Router Service
 * 
 * Course Mapping: Week 3 - Data Partitioning & Sharding
 * "Horizontal vs. vertical fragmentation; range-based vs. hash-based partitioning"
 * 
 * Two partitioning strategies:
 * 1. HASH PARTITIONING: For Orders (distribute by user_id)
 * 2. RANGE PARTITIONING: For Restaurants (distribute by city/region)
 */

// ==========================================
// Shard Configuration
// ==========================================
export interface ShardConfig {
  shardId: string;
  // In production, each shard would be a separate DB server
  // For this project, we simulate with separate schemas/collections
  postgresSchema: string;
  mongoCollection: string;
}

// Hash Partitioned Shards (for Orders)
const ORDER_SHARDS: ShardConfig[] = [
  { shardId: 'order_shard_0', postgresSchema: 'shard_0', mongoCollection: '' },
  { shardId: 'order_shard_1', postgresSchema: 'shard_1', mongoCollection: '' },
  { shardId: 'order_shard_2', postgresSchema: 'shard_2', mongoCollection: '' },
];

// Range Partitioned Shards (for Restaurants by region)
const RESTAURANT_SHARDS: ShardConfig[] = [
  { shardId: 'restaurant_shard_north', postgresSchema: '', mongoCollection: 'restaurants_north' },
  { shardId: 'restaurant_shard_south', postgresSchema: '', mongoCollection: 'restaurants_south' },
  { shardId: 'restaurant_shard_central', postgresSchema: '', mongoCollection: 'restaurants_central' },
];

// Range partition mapping (city → shard)
const REGION_MAP: Record<string, string> = {
  'karachi': 'restaurant_shard_south',
  'lahore': 'restaurant_shard_north',
  'islamabad': 'restaurant_shard_north',
  'peshawar': 'restaurant_shard_north',
  'quetta': 'restaurant_shard_central',
  'hyderabad': 'restaurant_shard_south',
  'multan': 'restaurant_shard_central',
  'faisalabad': 'restaurant_shard_north',
  'rawalpindi': 'restaurant_shard_north',
  'default': 'restaurant_shard_central',
};

// ==========================================
// Hash Partitioning (for Orders)
// ==========================================
/**
 * Determines which shard a user's orders go to.
 * Uses consistent hash on user_id to distribute evenly.
 * 
 * Formula: shard_index = hash(user_id) % NUM_SHARDS
 */
export function getOrderShard(userId: number): ShardConfig {
  const hash = crypto
    .createHash('md5')
    .update(userId.toString())
    .digest();

  const numericHash = ((hash[0] & 0xff) << 8) | (hash[1] & 0xff);
  const shardIndex = numericHash % ORDER_SHARDS.length;

  return ORDER_SHARDS[shardIndex];
}

// ==========================================
// Range Partitioning (for Restaurants)
// ==========================================
/**
 * Determines which shard a restaurant belongs to based on city.
 * Uses a range mapping table.
 */
export function getRestaurantShard(city: string): ShardConfig {
  const normalizedCity = city.toLowerCase().trim();
  const shardId = REGION_MAP[normalizedCity] ?? REGION_MAP['default'];

  return RESTAURANT_SHARDS.find(s => s.shardId === shardId) ?? RESTAURANT_SHARDS[2];
}

// ==========================================
// Shard Statistics
// ==========================================
export function getShardTopology(): {
  orderShards: Array<{ shardId: string; schema: string; partitionType: string }>;
  restaurantShards: Array<{ shardId: string; collection: string; partitionType: string; regions: string[] }>;
  regionMap: Record<string, string>;
} {
  return {
    orderShards: ORDER_SHARDS.map(s => ({
      shardId: s.shardId,
      schema: s.postgresSchema,
      partitionType: 'HASH (user_id)',
    })),
    restaurantShards: RESTAURANT_SHARDS.map(s => ({
      shardId: s.shardId,
      collection: s.mongoCollection,
      partitionType: 'RANGE (city/region)',
      regions: Object.entries(REGION_MAP)
        .filter(([, shard]) => shard === s.shardId)
        .map(([city]) => city),
    })),
    regionMap: REGION_MAP,
  };
}

/**
 * Simulate key distribution across shards
 */
export function simulateDistribution(totalUsers: number): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const shard of ORDER_SHARDS) {
    distribution[shard.shardId] = 0;
  }

  for (let userId = 1; userId <= totalUsers; userId++) {
    const shard = getOrderShard(userId);
    distribution[shard.shardId]++;
  }

  return distribution;
}