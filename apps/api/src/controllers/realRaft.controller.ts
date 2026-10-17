import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { realRaftService } from '../services/realRaft';
import { ApiError } from '../middlewares/errorHandler';

const logSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

// GET /api/real-raft/cluster
export async function getClusterState(_req: Request, res: Response, next: NextFunction) {
  try {
    const state = await realRaftService.getClusterState();

    res.json({
      success: true,
      data: state,
      courseNote: 'This connects to a real 3-node etcd cluster. etcd uses the Raft consensus algorithm internally to maintain strong consistency and elect a leader.',
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/real-raft/campaign
export async function campaignForLeader(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await realRaftService.campaignForLeader();
    
    res.json({
      success: true,
      data: result,
      explanation: result.won 
        ? 'SUCCESS: This API node won the Raft election and is now the Leader! It will hold leadership until it resigns or crashes.' 
        : `FAILED: Another node is already the leader (${result.leader}). In Raft, there can only be ONE leader per term to prevent split-brain.`,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/real-raft/resign
export async function resignLeadership(_req: Request, res: Response, next: NextFunction) {
  try {
    const resigned = await realRaftService.resign();
    res.json({
      success: true,
      data: { resigned },
      message: resigned ? 'Leadership resigned. A new election will begin immediately.' : 'This node was not the leader.',
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/real-raft/replicate
export async function replicateLog(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'key and value are required');

    const result = await realRaftService.appendLog(parsed.data.key, parsed.data.value);

    res.json({
      success: result.replicated,
      data: result,
      explanation: result.replicated
        ? `State Machine Replication successful. The log entry was appended to the Raft log and replicated to the quorum (majority) of etcd nodes before returning. Raft Term: ${result.term}.`
        : 'Replication failed. The Raft cluster might not have a quorum (e.g., 2 out of 3 nodes are down).',
    });
  } catch (error) {
    next(error);
  }
}