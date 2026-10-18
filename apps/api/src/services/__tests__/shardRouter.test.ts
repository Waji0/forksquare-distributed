import { describe, it, expect } from 'vitest';
import {
  getOrderShard,
  getRestaurantShard,
  simulateDistribution,
  getShardTopology,
} from '../shardRouter';

describe('ShardRouter (Week 3: Data Partitioning)', () => {
  it('should consistently route the same user to the same shard', () => {
    const shard1 = getOrderShard(42);
    const shard2 = getOrderShard(42);
    expect(shard1.shardId).toBe(shard2.shardId);
  });

  it('should use all shards across many users', () => {
    const shards = new Set<string>();
    for (let i = 1; i <= 100; i++) {
      shards.add(getOrderShard(i).shardId);
    }
    expect(shards.size).toBe(3);
  });

  it('should route Karachi restaurants to the south shard', () => {
    const shard = getRestaurantShard('karachi');
    expect(shard.shardId).toBe('restaurant_shard_south');
  });

  it('should route Lahore restaurants to the north shard', () => {
    const shard = getRestaurantShard('lahore');
    expect(shard.shardId).toBe('restaurant_shard_north');
  });

  it('should fall back to default shard for unknown cities', () => {
    const shard = getRestaurantShard('atlantis');
    expect(shard.shardId).toBe('restaurant_shard_central');
  });

  it('should be case-insensitive for city names', () => {
    const lower = getRestaurantShard('karachi');
    const upper = getRestaurantShard('KARACHI');
    expect(lower.shardId).toBe(upper.shardId);
  });

  it('should distribute users evenly (balance ratio < 1.2)', () => {
    const distribution = simulateDistribution(1000);
    const values = Object.values(distribution);
    const max = Math.max(...values);
    const min = Math.min(...values);
    expect(max / min).toBeLessThan(1.2);
  });

  it('should return a valid topology with 3 order and 3 restaurant shards', () => {
    const topology = getShardTopology();
    expect(topology.orderShards).toHaveLength(3);
    expect(topology.restaurantShards).toHaveLength(3);
    expect(topology.orderShards[0].partitionType).toContain('HASH');
  });
});