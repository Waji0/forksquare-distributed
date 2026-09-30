/**
 * Write-Ahead Log (WAL) Service
 * 
 * Course Mapping: Week 10 - "Write-Ahead Logging (WAL) in distributed nodes;
 * checkpointing; distributed ARIES crash recovery protocols"
 * 
 * The WAL principle: BEFORE modifying any data, write the intended
 * modification to a durable log. If the system crashes, the log can
 * be replayed to recover the state.
 * 
 * ARIES Recovery has 3 phases:
 * 1. ANALYSIS: Scan WAL to find active transactions at crash time
 * 2. REDO: Replay all committed operations from the log
 * 3. UNDO: Roll back all uncommitted operations
 */

export interface WALEntry {
  lsn: number;           // Log Sequence Number
  transactionId: string;
  operation: 'BEGIN' | 'UPDATE' | 'COMMIT' | 'ABORT';
  table: string;
  recordId: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export interface RecoveryResult {
  analysis: {
    activeTransactions: string[];
    committedTransactions: string[];
    abortedTransactions: string[];
  };
  redo: Array<{ lsn: number; transactionId: string; action: string }>;
  undo: Array<{ lsn: number; transactionId: string; action: string }>;
  finalState: Record<string, Record<string, string>>;
  explanation: string;
}

export class WriteAheadLog {
  private log: WALEntry[] = [];
  private lsnCounter: number = 0;
  private currentState: Record<string, Record<string, string>> = {};

  /**
   * Generate next LSN
   */
  private nextLSN(): number {
    return ++this.lsnCounter;
  }

  /**
   * Log a transaction operation
   */
  private addEntry(entry: Omit<WALEntry, 'lsn' | 'timestamp'>): WALEntry {
    const fullEntry: WALEntry = {
      ...entry,
      lsn: this.nextLSN(),
      timestamp: new Date().toISOString(),
    };
    this.log.push(fullEntry);
    return fullEntry;
  }

  /**
   * Begin a transaction
   */
  beginTransaction(txId: string): void {
    this.addEntry({
      transactionId: txId,
      operation: 'BEGIN',
      table: '',
      recordId: '',
      oldValue: null,
      newValue: null,
    });
  }

  /**
   * Update a record (WAL: log BEFORE modifying)
   */
  update(txId: string, table: string, recordId: string, oldValue: string, newValue: string): void {
    // Step 1: Write to WAL FIRST (Write-Ahead principle)
    this.addEntry({
      transactionId: txId,
      operation: 'UPDATE',
      table,
      recordId,
      oldValue,
      newValue,
    });

    // Step 2: Then modify the actual data
    if (!this.currentState[table]) {
      this.currentState[table] = {};
    }
    this.currentState[table][recordId] = newValue;
  }

  /**
   * Commit a transaction
   */
  commit(txId: string): void {
    this.addEntry({
      transactionId: txId,
      operation: 'COMMIT',
      table: '',
      recordId: '',
      oldValue: null,
      newValue: null,
    });
  }

  /**
   * Abort a transaction
   */
  abort(txId: string): void {
    this.addEntry({
      transactionId: txId,
      operation: 'ABORT',
      table: '',
      recordId: '',
      oldValue: null,
      newValue: null,
    });
  }

  /**
   * Simulate a CRASH
   * Clears the in-memory state but keeps the WAL
   */
  simulateCrash(): void {
    this.currentState = {};
    // WAL is on disk, so it survives the crash
  }

  /**
   * ARIES Recovery: Analyze, Redo, Undo
   */
  recover(): RecoveryResult {
    const committedTx = new Set<string>();
    const abortedTx = new Set<string>();
    const activeTx = new Set<string>();

    // ==========================================
    // PHASE 1: ANALYSIS
    // Scan the WAL to determine transaction states at crash time
    // ==========================================
    for (const entry of this.log) {
      if (entry.operation === 'BEGIN') {
        activeTx.add(entry.transactionId);
      } else if (entry.operation === 'COMMIT') {
        activeTx.delete(entry.transactionId);
        committedTx.add(entry.transactionId);
      } else if (entry.operation === 'ABORT') {
        activeTx.delete(entry.transactionId);
        abortedTx.add(entry.transactionId);
      }
    }

    // ==========================================
    // PHASE 2: REDO
    // Replay all operations from COMMITTED transactions
    // ==========================================
    const redoActions: RecoveryResult['redo'] = [];

    for (const entry of this.log) {
      if (entry.operation === 'UPDATE' && committedTx.has(entry.transactionId)) {
        if (!this.currentState[entry.table]) {
          this.currentState[entry.table] = {};
        }
        this.currentState[entry.table][entry.recordId] = entry.newValue ?? '';

        redoActions.push({
          lsn: entry.lsn,
          transactionId: entry.transactionId,
          action: `REDO: Set ${entry.table}.${entry.recordId} = ${entry.newValue}`,
        });
      }
    }

    // ==========================================
    // PHASE 3: UNDO
    // Roll back all operations from ACTIVE (uncommitted) transactions
    // Process in reverse order (newest first)
    // ==========================================
    const undoActions: RecoveryResult['undo'] = [];
    const reversedLog = [...this.log].reverse();

    for (const entry of reversedLog) {
      if (entry.operation === 'UPDATE' && activeTx.has(entry.transactionId)) {
        if (entry.oldValue !== null) {
          if (!this.currentState[entry.table]) {
            this.currentState[entry.table] = {};
          }
          this.currentState[entry.table][entry.recordId] = entry.oldValue;

          undoActions.push({
            lsn: entry.lsn,
            transactionId: entry.transactionId,
            action: `UNDO: Restore ${entry.table}.${entry.recordId} = ${entry.oldValue}`,
          });
        }
      }
    }

    return {
      analysis: {
        activeTransactions: Array.from(activeTx),
        committedTransactions: Array.from(committedTx),
        abortedTransactions: Array.from(abortedTx),
      },
      redo: redoActions,
      undo: undoActions,
      finalState: this.currentState,
      explanation: `ARIES Recovery completed. ${committedTx.size} committed transactions were REDONE. ${activeTx.size} active transactions were UNDONE. The database is now in a consistent state.`,
    };
  }

  /**
   * Get the current WAL contents
   */
  getLog(): WALEntry[] {
    return [...this.log];
  }

  /**
   * Get current state
   */
  getState(): Record<string, Record<string, string>> {
    return JSON.parse(JSON.stringify(this.currentState));
  }

  /**
   * Reset everything (for demo purposes)
   */
  reset(): void {
    this.log = [];
    this.lsnCounter = 0;
    this.currentState = {};
  }
}

// Global WAL instance
export const walService = new WriteAheadLog();