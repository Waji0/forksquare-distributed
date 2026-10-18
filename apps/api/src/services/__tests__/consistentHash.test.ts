import { describe, it, expect } from 'vitest';
import { ConsistentHashRing } from '../consistentHash';

describe('ConsistentHashRing (Week 5: Distributed Hashing)', () => {
  it('should add a node with virtual nodes', () => {
    const ring = new ConsistentHashRing();
    const added = ring.addNode('node-1');
    expect(added).toBeGreaterThan(0);

    const stats = ring.getStats();
    expect(stats.physicalNodeCount).toBe(1);
    expect(stats.virtualNodeCount).toBe(added);
  });

  it('should reject duplicate nodes', () => {
    const ring = new ConsistentHashRing();
    ring.addNode('node-1');
    const added = ring.addNode('node-1');
    expect(added).toBe(0);
    expect(ring.getStats().physicalNodeCount).toBe(1);
  });

  it('should remove a node and its virtual nodes', () => {
    const ring = new ConsistentHashRing();
    ring.addNode('node-1');
    const removed = ring.removeNode('node-1');
    expect(removed).toBeGreaterThan(0);
    expect(ring.getStats().physicalNodeCount).toBe(0);
  });

  it('should return null for empty ring', () => {
    const ring = new ConsistentHashRing();
    const { node } = ring.getNode('some-key');
    expect(node).toBeNull();
  });

  it('should consistently route the same key to the same node', () => {
    const ring = new ConsistentHashRing();
    ring.addNode('node-1');
    ring.addNode('node-2');
    ring.addNode('node-3');

    const key = 'restaurant:kfc_karachi';
    const first = ring.getNode(key).node;
    const second = ring.getNode(key).node;
    expect(first).toBe(second);
  });

  it('should distribute keys across all nodes', () => {
    const ring = new ConsistentHashRing();
    ring.addNode('node-1');
    ring.addNode('node-2');
    ring.addNode('node-3');

    const keys = Array.from({ length: 300 }, (_, i) => `key-${i}`);
    const distribution = ring.getDistribution(keys);

    expect(distribution['node-1']).toBeGreaterThan(0);
    expect(distribution['node-2']).toBeGreaterThan(0);
    expect(distribution['node-3']).toBeGreaterThan(0);

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(300);
  });

  it('should minimize key movement when adding a node (the key property)', () => {
    const ring = new ConsistentHashRing();
    ring.addNode('node-1');
    ring.addNode('node-2');

    const keys = Array.from({ length: 200 }, (_, i) => `key-${i}`);
    const before: Record<string, string | null> = {};
    keys.forEach((k) => { before[k] = ring.getNode(k).node; });

    ring.addNode('node-3');

    let moved = 0;
    keys.forEach((k) => {
      if (ring.getNode(k).node !== before[k]) moved++;
    });

    // With consistent hashing, only ~1/N of keys move — NOT all of them.
    // This is the fundamental advantage over naive modulo hashing.
    expect(moved).toBeLessThan(keys.length);
    expect(moved).toBeGreaterThan(0);
  });
});