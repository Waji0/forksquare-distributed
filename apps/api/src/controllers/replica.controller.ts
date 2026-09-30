import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { replicaManager } from '../services/readReplica';
import { ApiError } from '../middlewares/errorHandler';

const querySchema = z.object({
  operation: z.enum(['READ', 'WRITE']),
  query: z.string().min(1),
});

const nodeSchema = z.object({
  replicaId: z.string().min(1),
});

// ==========================================
// GET /api/replicas/topology
// ==========================================
export function getTopology(_req: Request, res: Response, _next: NextFunction): void {
  const topology = replicaManager.getTopology();

  res.json({
    success: true,
    data: topology,
    courseMapping: 'Week 4: Single-leader (active-passive) replication; synchronous vs. asynchronous replication trade-offs',
    explanation: {
      primary: 'Handles ALL writes. Single point of truth. Replicates changes to replicas.',
      replicas: 'Handle READ-ONLY queries. Reduce primary load. Have slight replication lag.',
      asyncReplication: 'Replicas receive updates asynchronously. Lower latency but risk of stale reads.',
      syncReplication: 'Replicas receive updates synchronously. Strong consistency but higher write latency.',
    },
  });
}

// ==========================================
// POST /api/replicas/route-query
// ==========================================
export function routeQuery(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'operation (READ|WRITE) and query are required');

    const { operation, query } = parsed.data;
    const result = replicaManager.routeQuery(operation, query);

    res.json({
      success: true,
      data: {
        ...result,
        query,
        topology: replicaManager.getTopology().nodes.map(n => ({
          id: n.id,
          role: n.role,
          queriesHandled: n.queriesHandled,
          isHealthy: n.isHealthy,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/replicas/kill
// ==========================================
export function killReplica(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = nodeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'replicaId is required');

    const killed = replicaManager.killReplica(parsed.data.replicaId);

    if (!killed) {
      throw new ApiError(404, `Replica '${parsed.data.replicaId}' not found`);
    }

    res.json({
      success: true,
      data: replicaManager.getTopology(),
      message: `Replica ${parsed.data.replicaId} has been killed. Reads will be redistributed to remaining replicas.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/replicas/recover
// ==========================================
export function recoverReplica(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = nodeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'replicaId is required');

    const recovered = replicaManager.recoverReplica(parsed.data.replicaId);

    if (!recovered) {
      throw new ApiError(404, `Replica '${parsed.data.replicaId}' not found`);
    }

    res.json({
      success: true,
      data: replicaManager.getTopology(),
      message: `Replica ${parsed.data.replicaId} recovered and re-joined the cluster.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/replicas/simulate-traffic
// ==========================================
export function simulateTraffic(_req: Request, res: Response, _next: NextFunction): void {
  replicaManager.resetCounters();

  const results: Array<{ operation: string; query: string; targetNode: string }> = [];

  // Simulate 20 reads and 5 writes
  for (let i = 0; i < 20; i++) {
    const result = replicaManager.routeQuery('READ', `SELECT * FROM restaurants WHERE id = ${i}`);
    results.push({ operation: 'READ', query: `SELECT restaurants #${i}`, targetNode: result.targetNode });
  }

  for (let i = 0; i < 5; i++) {
    const result = replicaManager.routeQuery('WRITE', `INSERT INTO orders VALUES (...)`);
    results.push({ operation: 'WRITE', query: `INSERT order #${i}`, targetNode: result.targetNode });
  }

  const topology = replicaManager.getTopology();

  res.json({
    success: true,
    data: {
      simulatedRequests: results.length,
      results,
      finalDistribution: topology.nodes.map(n => ({
        id: n.id,
        role: n.role,
        queriesHandled: n.queriesHandled,
      })),
      readDistribution: topology.totalReads,
      writeDistribution: topology.totalWrites,
    },
    explanation: '20 READ queries were distributed across replicas via Round-Robin. 5 WRITE queries all went to the PRIMARY. This demonstrates the read/write split pattern.',
  });
}