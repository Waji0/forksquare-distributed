import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { raftCluster } from '../services/raft';
import { ApiError } from '../middlewares/errorHandler';

const killNodeSchema = z.object({
  nodeId: z.string().min(1),
});

const appendLogSchema = z.object({
  command: z.string().min(1),
});

// ==========================================
// POST /api/raft/election
// ==========================================
export function runElection(_req: Request, res: Response, _next: NextFunction): void {
  const result = raftCluster.runElection();

  res.json({
    success: true,
    data: result,
    clusterState: raftCluster.getClusterState(),
  });
}

// ==========================================
// POST /api/raft/kill-node
// ==========================================
export function killNode(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = killNodeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'nodeId is required');

    raftCluster.killNode(parsed.data.nodeId);

    res.json({
      success: true,
      data: {
        killedNode: parsed.data.nodeId,
        clusterState: raftCluster.getClusterState(),
      },
      message: `Node ${parsed.data.nodeId} has been killed (simulated network partition). Run an election to see how the cluster recovers.`,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/raft/append-log
// ==========================================
export function appendLog(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = appendLogSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'command is required');

    const result = raftCluster.appendLog(parsed.data.command);

    if (!result.success) {
      throw new ApiError(409, 'No leader available. Run an election first.');
    }

    res.json({
      success: true,
      data: {
        entry: result.entry,
        clusterState: raftCluster.getClusterState(),
      },
      explanation: 'The leader appended the entry to its log and replicated it to all alive followers. In production Raft, this would require majority acknowledgment before committing.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/raft/state
// ==========================================
export function getClusterState(_req: Request, res: Response, _next: NextFunction): void {
  res.json({
    success: true,
    data: raftCluster.getClusterState(),
    explanation: {
      follower: 'Passive node. Responds to heartbeats from leader. Becomes candidate if heartbeats stop.',
      candidate: 'Requesting votes. Becomes leader if it gets majority.',
      leader: 'Handles all client requests. Sends heartbeats. Replicates log to followers.',
    },
  });
}