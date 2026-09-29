import crypto from 'crypto';

/**
 * Consistent Hashing Ring
 * 
 * Course Mapping: Week 5 - Distributed Hashing & Cluster Topology
 * "Consistent hashing algorithms; ring topologies; virtual nodes; 
 *  dynamic cluster rebalancing and node join/leave protocols"
 * 
 * How it works:
 * 1. Each physical node gets VIRTUAL_NODES positions on a 32-bit hash ring
 * 2. Each key is hashed to a position on the ring
 * 3. The key is assigned to the first node encountered clockwise
 * 4. When a node joins/leaves, only K/N keys need to move (not all keys)
 * 
 * Virtual nodes ensure even distribution across physical nodes.
 */

const VIRTUAL_NODES_PER_NODE = 150;

export class ConsistentHashRing {
  private ring: Map<number, string> = new Map();
  private sortedKeys: number[] = [];
  private physicalNodes: Set<string> = new Set();

  /**
   * MD5-based hash function for ring positions
   * Returns a 32-bit unsigned integer
   */
  private hash(key: string): number {
    const digest = crypto.createHash('md5').update(key).digest();
    return (
      ((digest[0] & 0xff) << 24) |
      ((digest[1] & 0xff) << 16) |
      ((digest[2] & 0xff) << 8) |
      (digest[3] & 0xff)
    ) >>> 0; // Ensure unsigned
  }

  /**
   * Add a physical node with virtual node replicas
   */
  addNode(nodeName: string): number {
    if (this.physicalNodes.has(nodeName)) {
      return 0; // Already exists
    }

    this.physicalNodes.add(nodeName);
    let addedVirtualNodes = 0;

    for (let i = 0; i < VIRTUAL_NODES_PER_NODE; i++) {
      const virtualKey = this.hash(`${nodeName}#vnode${i}`);

      if (!this.ring.has(virtualKey)) {
        this.ring.set(virtualKey, nodeName);
        this.sortedKeys.push(virtualKey);
        addedVirtualNodes++;
      }
    }

    // Re-sort the ring positions
    this.sortedKeys.sort((a, b) => a - b);

    return addedVirtualNodes;
  }

  /**
   * Remove a physical node and all its virtual nodes
   */
  removeNode(nodeName: string): number {
    if (!this.physicalNodes.has(nodeName)) {
      return 0;
    }

    this.physicalNodes.delete(nodeName);
    let removedVirtualNodes = 0;

    for (let i = 0; i < VIRTUAL_NODES_PER_NODE; i++) {
      const virtualKey = this.hash(`${nodeName}#vnode${i}`);

      if (this.ring.has(virtualKey) && this.ring.get(virtualKey) === nodeName) {
        this.ring.delete(virtualKey);
        removedVirtualNodes++;
      }
    }

    this.sortedKeys = this.sortedKeys.filter(k => this.ring.has(k));

    return removedVirtualNodes;
  }

  /**
   * Look up which physical node owns a given key
   * Uses binary search on the sorted ring
   */
  getNode(key: string): { node: string | null; hashPosition: number } {
    if (this.sortedKeys.length === 0) {
      return { node: null, hashPosition: 0 };
    }

    const hashPosition = this.hash(key);

    // Binary search: find first ring position >= hashPosition
    let lo = 0;
    let hi = this.sortedKeys.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedKeys[mid] < hashPosition) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Wrap around if we've gone past the last position
    const index = lo % this.sortedKeys.length;
    const node = this.ring.get(this.sortedKeys[index]) ?? null;

    return { node, hashPosition };
  }

  /**
   * Get distribution statistics
   */
  getDistribution(keys: string[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const node of this.physicalNodes) {
      distribution[node] = 0;
    }

    for (const key of keys) {
      const { node } = this.getNode(key);
      if (node) {
        distribution[node] = (distribution[node] ?? 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Get ring statistics
   */
  getStats(): {
    physicalNodeCount: number;
    virtualNodeCount: number;
    virtualNodesPerNode: number;
    physicalNodes: string[];
  } {
    return {
      physicalNodeCount: this.physicalNodes.size,
      virtualNodeCount: this.ring.size,
      virtualNodesPerNode: VIRTUAL_NODES_PER_NODE,
      physicalNodes: Array.from(this.physicalNodes),
    };
  }
}

// Global ring instance for cache routing
export const cacheRing = new ConsistentHashRing();

// Initialize with default cache nodes
cacheRing.addNode('cache-node-alpha');
cacheRing.addNode('cache-node-beta');
cacheRing.addNode('cache-node-gamma');