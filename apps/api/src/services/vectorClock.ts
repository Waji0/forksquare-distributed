/**
 * Vector Clock Service
 * 
 * Course Mapping: Week 7 - Time & Event Ordering in Distributed Systems
 * "Physical clock drift; logical clocks (Lamport Timestamps, Vector Clocks); 
 *  Google TrueTime API and causal ordering"
 * 
 * A Vector Clock tracks causality across distributed nodes.
 * Each node maintains a counter. When an event occurs:
 * 1. The node increments its own counter
 * 2. The clock is attached to the message/event
 * 3. The receiver merges clocks (element-wise max)
 * 
 * Comparison:
 * - If all elements of Clock A <= Clock B, then A happened before B
 * - If all elements of Clock A >= Clock B, then A happened after B
 * - If neither, the events are CONCURRENT (conflict!)
 */

export type VectorClock = Record<string, number>;

export type ClockComparison = 'before' | 'after' | 'concurrent' | 'equal';

export class VectorClockService {
  /**
   * Create a new empty vector clock
   */
  create(): VectorClock {
    return {};
  }

  /**
   * Increment the clock for a specific node
   * Called when a local event occurs
   */
  increment(clock: VectorClock, nodeId: string): VectorClock {
    return {
      ...clock,
      [nodeId]: (clock[nodeId] ?? 0) + 1,
    };
  }

  /**
   * Merge two vector clocks (element-wise maximum)
   * Called when receiving a message from another node
   */
  merge(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 };

    for (const [nodeId, timestamp] of Object.entries(clock2)) {
      merged[nodeId] = Math.max(merged[nodeId] ?? 0, timestamp);
    }

    return merged;
  }

  /**
   * Compare two vector clocks to determine causal ordering
   * 
   * Returns:
   * - 'before': clock1 happened before clock2
   * - 'after': clock1 happened after clock2
   * - 'concurrent': clocks are concurrent (CONFLICT - needs resolution)
   * - 'equal': clocks are identical
   */
  compare(clock1: VectorClock, clock2: VectorClock): ClockComparison {
    const allNodes = new Set([
      ...Object.keys(clock1),
      ...Object.keys(clock2),
    ]);

    let clock1IsBefore = false;
    let clock2IsBefore = false;

    for (const nodeId of allNodes) {
      const time1 = clock1[nodeId] ?? 0;
      const time2 = clock2[nodeId] ?? 0;

      if (time1 < time2) clock1IsBefore = true;
      if (time1 > time2) clock2IsBefore = true;
    }

    if (!clock1IsBefore && !clock2IsBefore) return 'equal';
    if (clock1IsBefore && !clock2IsBefore) return 'before';
    if (!clock1IsBefore && clock2IsBefore) return 'after';
    return 'concurrent'; // CONFLICT!
  }

  /**
   * Check if two clocks are concurrent (conflicting)
   */
  isConcurrent(clock1: VectorClock, clock2: VectorClock): boolean {
    return this.compare(clock1, clock2) === 'concurrent';
  }

  /**
   * Format a vector clock for display
   */
  format(clock: VectorClock): string {
    const entries = Object.entries(clock)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([node, time]) => `${node}:${time}`);
    return `[${entries.join(', ')}]`;
  }
}

// Global instance
export const vectorClockService = new VectorClockService();