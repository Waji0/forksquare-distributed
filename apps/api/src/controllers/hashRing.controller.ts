import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cacheRing } from '../services/consistentHash';
import { ApiError } from '../middlewares/errorHandler';

const nodeSchema = z.object({
  nodeName: z.string().min(1).max(100),
});

const lookupSchema = z.object({
  key: z.string().min(1).max(200),
});

const distributionSchema = z.object({
  count: z.string().optional(),
});

// ==========================================
// GET /api/hash-ring/stats
// ==========================================
export function getRingStats(_req: Request, res: Response, _next: NextFunction): void {
  const stats = cacheRing.getStats();

  res.json({
    success: true,
    data: stats,
    explanation: {
      consistentHashing: 'Each physical node gets 150 virtual nodes on a 32-bit hash ring',
      lookup: 'Keys are hashed and assigned to the first node encountered clockwise',
      rebalancing: 'When a node joins/leaves, only K/N keys move (not all keys)',
    },
  });
}

// ==========================================
// POST /api/hash-ring/add-node
// ==========================================
export function addNode(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = nodeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'nodeName is required');

    const { nodeName } = parsed.data;
    const addedVNodes = cacheRing.addNode(nodeName);

    if (addedVNodes === 0) {
      throw new ApiError(409, `Node '${nodeName}' already exists in the ring`);
    }

    res.status(201).json({
      success: true,
      data: {
        nodeName,
        virtualNodesAdded: addedVNodes,
        ringStats: cacheRing.getStats(),
      },
      message: `Node '${nodeName}' joined the ring with ${addedVNodes} virtual nodes. Only affected keys will be rebalanced.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/hash-ring/remove-node
// ==========================================
export function removeNode(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = nodeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'nodeName is required');

    const { nodeName } = parsed.data;
    const removedVNodes = cacheRing.removeNode(nodeName);

    if (removedVNodes === 0) {
      throw new ApiError(404, `Node '${nodeName}' not found in the ring`);
    }

    res.json({
      success: true,
      data: {
        nodeName,
        virtualNodesRemoved: removedVNodes,
        ringStats: cacheRing.getStats(),
      },
      message: `Node '${nodeName}' left the ring. Its keys will be redistributed to remaining nodes.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/hash-ring/lookup?key=restaurant:42
// ==========================================
export function lookupKey(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = lookupSchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, 'key query parameter is required');

    const { key } = parsed.data;
    const { node, hashPosition } = cacheRing.getNode(key);

    res.json({
      success: true,
      data: {
        key,
        assignedNode: node,
        hashPosition,
        hashPositionHex: `0x${hashPosition.toString(16).padStart(8, '0')}`,
      },
      explanation: 'The key was hashed to a position on the ring and assigned to the first node encountered clockwise.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/hash-ring/distribution?count=1000
// ==========================================
export function getDistribution(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = distributionSchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, 'Invalid parameters');

    const count = Math.min(10000, Math.max(1, Number(parsed.data.count) || 1000));

    // Generate sample keys
    const sampleKeys = Array.from({ length: count }, (_, i) => `cache:key:${i}`);

    const distribution = cacheRing.getDistribution(sampleKeys);
    const stats = cacheRing.getStats();

    res.json({
      success: true,
      data: {
        totalKeys: count,
        distribution,
        physicalNodes: stats.physicalNodeCount,
        balanceRatio: Object.values(distribution).length > 0
          ? (Math.max(...Object.values(distribution)) / Math.min(...Object.values(distribution).filter(v => v > 0) || [1])).toFixed(2)
          : 'N/A',
      },
      explanation: 'Ideally, keys should be evenly distributed. A balance ratio close to 1.0 means good distribution. Virtual nodes help achieve this.',
    });
  } catch (error) {
    next(error);
  }
}