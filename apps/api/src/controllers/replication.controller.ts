import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pgPool, pgReplicaPool } from '../config/db';

/**
 * Real Streaming Replication Controller
 *
 * Course Mapping: Week 4 - Replication Strategies
 * These endpoints expose REAL replication state from PostgreSQL.
 */

// ==========================================
// GET /api/replication/status
// Shows live streaming replication state from the primary
// ==========================================
export async function getReplicationStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // pg_stat_replication shows all connected standbys
    const replResult = await pgPool.query(`
      SELECT
        application_name,
        client_addr,
        state,
        sync_state,
        sent_lsn,
        write_lsn,
        flush_lsn,
        replay_lsn,
        write_lag,
        flush_lag,
        replay_lag
      FROM pg_stat_replication
    `);

    const slotsResult = await pgPool.query(`
      SELECT slot_name, slot_type, active, active_pid
      FROM pg_replication_slots
    `);

    const walLevel = await pgPool.query(`SHOW wal_level`);
    const maxWalSenders = await pgPool.query(`SHOW max_wal_senders`);

    res.json({
      success: true,
      data: {
        primaryConfig: {
          wal_level: walLevel.rows[0].wal_level,
          max_wal_senders: maxWalSenders.rows[0].max_wal_senders,
        },
        connectedStandbys: replResult.rows,
        replicationSlots: slotsResult.rows,
        standbyCount: replResult.rows.length,
      },
      explanation: {
        state: "'streaming' means the standby is actively receiving WAL in real-time.",
        sync_state: "'async' = asynchronous (lower latency, risk of data loss). 'sync' = synchronous (stronger durability, higher latency).",
        replay_lag: 'Time between WAL being written on primary and replayed on standby.',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/replication/standby-status
// Confirms the standby is in read-only recovery mode
// ==========================================
export async function getStandbyStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pgReplicaPool.query('SELECT pg_is_in_recovery() AS is_standby');
    const isStandby = result.rows[0].is_standby;

    // pg_last_wal_replay_lsn shows how far the standby has replayed
    const replayLsn = await pgReplicaPool.query(
      'SELECT pg_last_wal_replay_lsn() AS last_replay_lsn'
    );

    res.json({
      success: true,
      data: {
        isStandby,
        isReadOnly: isStandby,
        lastReplayLsn: replayLsn.rows[0].last_replay_lsn,
      },
      explanation: isStandby
        ? 'This node is in recovery mode (standby). It accepts SELECT queries but rejects INSERT/UPDATE/DELETE.'
        : 'WARNING: This node is NOT in recovery. It may have been promoted to primary.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/replication/lag-demo
// Writes to primary, then measures how long it takes
// to appear on the standby (async replication lag)
// ==========================================
export async function demonstrateReplicationLag(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const testValue = `lag_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const writeTime = Date.now();

    // Step 1: Write to PRIMARY
    await pgPool.query(
      'INSERT INTO replication_demo (test_value) VALUES ($1)',
      [testValue]
    );

    // Step 2: Poll the STANDBY until the row appears
    const maxWaitMs = 5000;
    const pollIntervalMs = 25;
    const deadline = writeTime + maxWaitMs;
    let foundOnReplica = false;
    let lagMs: number | null = null;

    while (Date.now() < deadline) {
      const result = await pgReplicaPool.query(
        'SELECT id FROM replication_demo WHERE test_value = $1',
        [testValue]
      );
      if (result.rows.length > 0) {
        foundOnReplica = true;
        lagMs = Date.now() - writeTime;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    res.json({
      success: true,
      data: {
        testValue,
        writtenToPrimary: true,
        foundOnReplica,
        replicationLagMs: lagMs,
      },
      explanation: foundOnReplica
        ? `The row appeared on the standby ${lagMs}ms after being written to the primary. This is the asynchronous replication lag. In production, this is typically 1-100ms on a local network.`
        : 'The row did not appear on the standby within 5 seconds. Check /api/replication/status to verify the standby is connected.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/replication/verify-read-only
// Proves the standby rejects writes
// ==========================================
export async function verifyReadOnly(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let writeBlocked = false;
    let errorMessage = '';

    try {
      // Attempt a write on the STANDBY — this should FAIL
      await pgReplicaPool.query(
        'INSERT INTO replication_demo (test_value) VALUES ($1)',
        ['this_should_fail']
      );
    } catch (err: any) {
      writeBlocked = true;
      errorMessage = err.message;
    }

    res.json({
      success: true,
      data: {
        writeBlocked,
        errorMessage,
      },
      explanation: writeBlocked
        ? 'The standby correctly REJECTED the write because it is in read-only recovery mode. This confirms hot-standby behavior.'
        : 'ERROR: The standby accepted a write. It is not properly configured as a standby.',
    });
  } catch (error) {
    next(error);
  }
}