import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RealTwoPhaseCommit } from '../services/real2pc';
import { ApiError } from '../middlewares/errorHandler';

const executeSchema = z.object({
  userId: z.number().int().positive().default(1),
  itemId: z.string().default('item_pizza_1'),
  amount: z.number().positive().default(999.99),
  simulateCoordinatorCrash: z.boolean().optional().default(false),
  simulateNodeFailure: z.boolean().optional().default(false),
});

const recoverSchema = z.object({
  txGid: z.string().min(1),
  action: z.enum(['COMMIT', 'ROLLBACK']),
});

// ==========================================
// POST /api/real-2pc/execute
// ==========================================
export async function executeReal2PC(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = executeSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');

    const { userId, itemId, amount, simulateCoordinatorCrash, simulateNodeFailure } = parsed.data;

    const tpc = new RealTwoPhaseCommit(simulateCoordinatorCrash, simulateNodeFailure);
    const result = await tpc.execute(userId, itemId, amount);

    res.json({
      success: result.outcome !== 'ABORTED',
      data: result,
      courseNote: 'This uses actual PostgreSQL PREPARE TRANSACTION. If outcome is BLOCKED, check /api/real-2pc/blocked to see the locks held in pg_prepared_xacts.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/real-2pc/blocked
// Shows transactions stuck in the PREPARED state (The Blocking Problem)
// ==========================================
export async function getBlockedTransactions(_req: Request, res: Response, next: NextFunction) {
  try {
    const blocked = await RealTwoPhaseCommit.getBlockedTransactions();
    res.json({
      success: true,
      data: blocked,
      count: blocked.length,
      explanation: blocked.length > 0
        ? 'These transactions are BLOCKED. They hold row-level locks on the database but are not committed. This happens when the 2PC coordinator crashes after Phase 1 (PREPARE) but before Phase 2 (COMMIT/ABORT). A DBA must manually resolve them.'
        : 'No blocked transactions. All 2PC flows completed or rolled back cleanly.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/real-2pc/recover
// ==========================================
export async function recoverTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = recoverSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'txGid and action (COMMIT|ROLLBACK) are required');

    const result = await RealTwoPhaseCommit.recoverTransaction(parsed.data.txGid, parsed.data.action);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.message });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}