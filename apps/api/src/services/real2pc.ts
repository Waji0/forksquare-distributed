// import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import { pgPool } from '../config/db';

export interface TwoPCResult {
  transactionId: string;
  outcome: 'COMMITTED' | 'ABORTED' | 'BLOCKED';
  phase1Inventory: 'PREPARED' | 'FAILED';
  phase1Order: 'PREPARED' | 'FAILED' | 'SKIPPED';
  phase2Action: 'COMMIT PREPARED' | 'ROLLBACK PREPARED' | 'COORDINATOR CRASHED';
  explanation: string;
}

export class RealTwoPhaseCommit {
  private txId: string;
  private simulateCoordinatorCrash: boolean;
  private simulateNodeFailure: boolean;

  constructor(simulateCoordinatorCrash = false, simulateNodeFailure = false) {
    this.txId = `tx_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    this.simulateCoordinatorCrash = simulateCoordinatorCrash;
    this.simulateNodeFailure = simulateNodeFailure;
  }

  async execute(userId: number, itemId: string, amount: number): Promise<TwoPCResult> {
    const result: TwoPCResult = {
      transactionId: this.txId,
      outcome: 'ABORTED',
      phase1Inventory: 'FAILED',
      phase1Order: 'SKIPPED',
      phase2Action: 'ROLLBACK PREPARED',
      explanation: '',
    };

    const clientA = await pgPool.connect();
    const clientB = await pgPool.connect();

    // Track if a standard transaction block is currently open
    let txAOpen = false;
    let txBOpen = false;

    try {
      // ==========================================
      // PHASE 1: PREPARE (Voting Phase)
      // ==========================================
      
      // Node A: Inventory
      await clientA.query('BEGIN');
      txAOpen = true;
      
      const invRes = await clientA.query(
        'UPDATE inventory SET quantity = quantity - 1, version = version + 1 WHERE item_id = $1 AND quantity > 0',
        [itemId]
      );
      
      if (invRes.rowCount === 0) {
        throw new Error(`Insufficient stock for ${itemId}`);
      }

      await clientA.query(`PREPARE TRANSACTION '${this.txId}_A'`);
      txAOpen = false; // PREPARE detaches the transaction from the session
      result.phase1Inventory = 'PREPARED';

      // Node B: Orders
      if (this.simulateNodeFailure) {
        result.phase1Order = 'FAILED';
        result.outcome = 'ABORTED';
        result.phase2Action = 'ROLLBACK PREPARED';
        result.explanation = `Node B (Orders) failed during Phase 1. Coordinator instructs Node A to ROLLBACK PREPARED.`;
        
        await clientA.query(`ROLLBACK PREPARED '${this.txId}_A'`);
        return result;
      }

      await clientB.query('BEGIN');
      txBOpen = true;
      
      await clientB.query(
        'INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3)',
        [userId, 'CONFIRMED_2PC', amount]
      );
      
      await clientB.query(`PREPARE TRANSACTION '${this.txId}_B'`);
      txBOpen = false;
      result.phase1Order = 'PREPARED';

      // ==========================================
      // CHECK FOR COORDINATOR CRASH (The Blocking Scenario)
      // ==========================================
      if (this.simulateCoordinatorCrash) {
        result.outcome = 'BLOCKED';
        result.phase2Action = 'COORDINATOR CRASHED';
        result.explanation = `COORDINATOR FAILURE: Both nodes are in the PREPARED state, holding locks. The coordinator crashed before sending the final decision. The transactions are now BLOCKED and visible in pg_prepared_xacts.`;
        
        // Intentionally DO NOT commit or rollback. 
        return result;
      }

      // ==========================================
      // PHASE 2: COMMIT (Decision Phase)
      // ==========================================
      await clientA.query(`COMMIT PREPARED '${this.txId}_A'`);
      await clientB.query(`COMMIT PREPARED '${this.txId}_B'`);
      
      result.outcome = 'COMMITTED';
      result.phase2Action = 'COMMIT PREPARED';
      result.explanation = `SUCCESS: Both nodes reached the PREPARED state. The coordinator issued COMMIT PREPARED to both.`;

      return result;

    } catch (error) {
      // 1. If a standard transaction is still open (failed before PREPARE), roll it back to clean the connection
      if (txAOpen) {
        try { await clientA.query('ROLLBACK'); } catch {}
      }
      if (txBOpen) {
        try { await clientB.query('ROLLBACK'); } catch {}
      }

      // 2. If it was successfully prepared, roll back the prepared transaction
      try { await pgPool.query(`ROLLBACK PREPARED '${this.txId}_A'`); } catch {}
      try { await pgPool.query(`ROLLBACK PREPARED '${this.txId}_B'`); } catch {}
      
      result.outcome = 'ABORTED';
      result.explanation = `Transaction aborted due to error: ${(error as Error).message}`;
      return result;
    } finally {
      clientA.release();
      clientB.release();
    }
  }

  static async getBlockedTransactions() {
    const result = await pgPool.query(`
      SELECT transaction, gid, prepared, owner, database 
      FROM pg_prepared_xacts
    `);
    return result.rows;
  }

  static async recoverTransaction(txGid: string, action: 'COMMIT' | 'ROLLBACK') {
    const client = await pgPool.connect();
    try {
      if (action === 'COMMIT') {
        await client.query(`COMMIT PREPARED '${txGid}'`);
      } else {
        await client.query(`ROLLBACK PREPARED '${txGid}'`);
      }
      return { success: true, message: `Transaction ${txGid} ${action.toLowerCase()}ed successfully.` };
    } catch (error: any) {
      // Gracefully handle "does not exist" instead of crashing the API
      if (error.message && error.message.includes('does not exist')) {
        return { success: false, message: `Transaction '${txGid}' does not exist or was already resolved. (Hint: GIDs usually end in _A or _B)` };
      }
      throw error;
    } finally {
      client.release();
    }
  }
}