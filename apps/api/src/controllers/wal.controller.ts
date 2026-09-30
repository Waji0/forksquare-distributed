import { Request, Response, NextFunction } from 'express';
import { walService } from '../services/writeAheadLog';

// ==========================================
// POST /api/wal/demo
// ==========================================
/**
 * Runs a complete WAL + Crash + ARIES Recovery demo
 */
export function runWALDemo(_req: Request, res: Response, _next: NextFunction): void {
  walService.reset();

  // Transaction 1: Successful order placement (will be COMMITTED)
  walService.beginTransaction('TX_001');
  walService.update('TX_001', 'inventory', 'burger_gold', '1', '0');
  walService.update('TX_001', 'orders', 'order_1', '', 'CONFIRMED');
  walService.commit('TX_001');

  // Transaction 2: Another successful transaction
  walService.beginTransaction('TX_002');
  walService.update('TX_002', 'inventory', 'pizza_slice', '5', '4');
  walService.commit('TX_002');

  // Transaction 3: CRASHES mid-operation (will be ACTIVE at crash time)
  walService.beginTransaction('TX_003');
  walService.update('TX_003', 'inventory', 'sushi_roll', '10', '9');
  walService.update('TX_003', 'orders', 'order_2', '', 'PENDING');
  // NO COMMIT! This simulates a crash before commit

  // Get state before crash
  const stateBeforeCrash = walService.getState();
  const walBeforeCrash = walService.getLog();

  // SIMULATE CRASH
  walService.simulateCrash();
  const stateAfterCrash = walService.getState(); // Should be empty

  // RECOVER using ARIES
  const recovery = walService.recover();

  res.json({
    success: true,
    data: {
      step1_beforeCrash: {
        state: stateBeforeCrash,
        walEntries: walBeforeCrash.length,
        note: 'All 3 transactions applied to memory. TX_001 and TX_002 committed. TX_003 still active.',
      },
      step2_crash: {
        stateAfterCrash,
        note: 'CRASH! In-memory state lost. But WAL survived (it is on disk).',
      },
      step3_ariesRecovery: recovery,
      step4_finalState: walService.getState(),
    },
    explanation: {
      wal: 'Write-Ahead Logging ensures that every modification is logged BEFORE being applied. This makes recovery possible after crashes.',
      analysis: 'ARIES scans the WAL to find which transactions were committed vs. active at crash time.',
      redo: 'Committed transactions are replayed from the WAL to restore their changes.',
      undo: 'Active (uncommitted) transactions are rolled back using the old values stored in the WAL.',
    },
  });
}

// ==========================================
// GET /api/wal/log
// ==========================================
export function getWALLog(_req: Request, res: Response, _next: NextFunction): void {
  res.json({
    success: true,
    data: walService.getLog(),
    currentState: walService.getState(),
  });
}

// ==========================================
// POST /api/wal/reset
// ==========================================
export function resetWAL(_req: Request, res: Response, _next: NextFunction): void {
  walService.reset();
  res.json({ success: true, message: 'WAL reset successfully' });
}