import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { vectorClockService, VectorClock } from '../services/vectorClock';
import { ApiError } from '../middlewares/errorHandler';

/**
 * Vector Clock Conflict Detection Controller
 * 
 * Simulates the scenario from the course:
 * Two restaurant managers update the same menu item from different devices
 * at the same time. Vector clocks detect the conflict.
 */

// In-memory store for demo (in production, this would be in the DB)
const menuVersions: Map<string, { data: string; clock: VectorClock }> = new Map();

const updateSchema = z.object({
  itemId: z.string().min(1),
  nodeId: z.string().min(1),
  newData: z.string().min(1),
});

// ==========================================
// POST /api/vector-clock/update
// ==========================================
export function updateMenuItem(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'itemId, nodeId, and newData are required');

    const { itemId, nodeId, newData } = parsed.data;
    const existing = menuVersions.get(itemId);

    if (!existing) {
      // First write: create new vector clock
      const newClock = vectorClockService.increment({}, nodeId);
      menuVersions.set(itemId, { data: newData, clock: newClock });

      res.status(201).json({
        success: true,
        data: {
          itemId,
          nodeId,
          newData,
          vectorClock: newClock,
          vectorClockFormatted: vectorClockService.format(newClock),
          conflict: false,
          message: 'Item created successfully. No conflict.',
        },
      });
      return;
    }

    // Check for conflict using vector clocks
    const incomingClock = vectorClockService.increment(existing.clock, nodeId);
    const comparison = vectorClockService.compare(existing.clock, incomingClock);

    if (comparison === 'concurrent') {
      // CONFLICT DETECTED!
      res.status(409).json({
        success: false,
        data: {
          itemId,
          nodeId,
          newData,
          existingData: existing.data,
          existingClock: existing.clock,
          incomingClock,
          comparison,
          conflict: true,
          message: '⚠️ CONFLICT DETECTED: Two concurrent updates to the same item. Manual resolution required.',
          resolution: 'Last-Writer-Wins (LWW) applied. In production, use CRDTs or manual merge.',
        },
      });

      // Apply Last-Writer-Wins for demo
      menuVersions.set(itemId, { data: newData, clock: incomingClock });
      return;
    }

    // No conflict: apply update
    menuVersions.set(itemId, { data: newData, clock: incomingClock });

    res.json({
      success: true,
      data: {
        itemId,
        nodeId,
        newData,
        vectorClock: incomingClock,
        vectorClockFormatted: vectorClockService.format(incomingClock),
        comparison,
        conflict: false,
        message: `Update applied. Causal ordering: ${comparison}.`,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/vector-clock/simulate-conflict
// ==========================================
/**
 * Simulates two concurrent updates to demonstrate conflict detection.
 * This is the key demo for Week 7.
 */
export function simulateConflict(_req: Request, res: Response, _next: NextFunction): void {
  const vcs = vectorClockService;

  // Simulate: Two restaurant managers (Node A and Node B) update the same menu item

  // Step 1: Initial state (both nodes have seen the same base version)
  const baseClock: VectorClock = { 'node-A': 1, 'node-B': 1 };

  // Step 2: Node A updates the price (increments its own counter)
  const clockA = vcs.increment(baseClock, 'node-A');
  // clockA = { 'node-A': 2, 'node-B': 1 }

  // Step 3: Node B updates the description (increments its own counter)
  const clockB = vcs.increment(baseClock, 'node-B');
  // clockB = { 'node-A': 1, 'node-B': 2 }

  // Step 4: Compare the two clocks
  const comparison = vcs.compare(clockA, clockB);
  const isConflict = vcs.isConcurrent(clockA, clockB);

  res.json({
    success: true,
    data: {
      scenario: 'Two restaurant managers update the same menu item simultaneously',
      baseClock: {
        clock: baseClock,
        formatted: vcs.format(baseClock),
      },
      nodeA_update: {
        action: 'Updated price to Rs. 450',
        clock: clockA,
        formatted: vcs.format(clockA),
      },
      nodeB_update: {
        action: 'Updated description to "Spicy Karahi"',
        clock: clockB,
        formatted: vcs.format(clockB),
      },
      comparison,
      isConflict,
      explanation: isConflict
        ? 'CONCURRENT: Neither clock dominates the other. Node A has a higher counter for A, but Node B has a higher counter for B. This is a genuine conflict that requires resolution (LWW, CRDT, or manual merge).'
        : 'No conflict detected.',
      resolutionApplied: 'Last-Writer-Wins (LWW)',
    },
  });
}

// ==========================================
// GET /api/vector-clock/state
// ==========================================
export function getMenuState(_req: Request, res: Response, _next: NextFunction): void {
  const items: Array<{
    itemId: string;
    data: string;
    clock: VectorClock;
    clockFormatted: string;
  }> = [];

  for (const [itemId, version] of menuVersions.entries()) {
    items.push({
      itemId,
      data: version.data,
      clock: version.clock,
      clockFormatted: vectorClockService.format(version.clock),
    });
  }

  res.json({
    success: true,
    data: items,
  });
}