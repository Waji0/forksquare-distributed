import { describe, it, expect, beforeEach } from 'vitest';
import { WriteAheadLog } from '../writeAheadLog';

describe('WriteAheadLog (Week 10: WAL & ARIES Recovery)', () => {
  let wal: WriteAheadLog;

  beforeEach(() => {
    wal = new WriteAheadLog();
  });

  it('should assign incrementing LSNs', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    wal.commit('TX1');

    const log = wal.getLog();
    expect(log).toHaveLength(3);
    expect(log[0].lsn).toBe(1);
    expect(log[1].lsn).toBe(2);
    expect(log[2].lsn).toBe(3);
  });

  it('should REDO committed transactions after crash', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    wal.commit('TX1');

    wal.simulateCrash();
    expect(wal.getState()).toEqual({}); // In-memory state lost

    const recovery = wal.recover();
    expect(recovery.analysis.committedTransactions).toContain('TX1');
    expect(recovery.redo.length).toBeGreaterThan(0);
    expect(wal.getState().inventory.item1).toBe('9'); // REDO re-applied
  });

  it('should UNDO uncommitted transactions after crash', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    // No commit — simulates crash mid-transaction

    wal.simulateCrash();
    const recovery = wal.recover();

    expect(recovery.analysis.activeTransactions).toContain('TX1');
    expect(recovery.undo.length).toBeGreaterThan(0);
    expect(wal.getState().inventory.item1).toBe('10'); // UNDO restored old value
  });

  it('should handle mixed committed and uncommitted transactions', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    wal.commit('TX1');

    wal.beginTransaction('TX2');
    wal.update('TX2', 'inventory', 'item2', '5', '4');
    // TX2 left uncommitted

    wal.simulateCrash();
    const recovery = wal.recover();

    expect(recovery.analysis.committedTransactions).toContain('TX1');
    expect(recovery.analysis.activeTransactions).toContain('TX2');
    expect(wal.getState().inventory.item1).toBe('9'); // REDO
    expect(wal.getState().inventory.item2).toBe('5'); // UNDO
  });

  it('should recognize explicitly aborted transactions', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    wal.abort('TX1');

    wal.simulateCrash();
    const recovery = wal.recover();

    expect(recovery.analysis.abortedTransactions).toContain('TX1');
    expect(wal.getState().inventory?.item1).toBeUndefined();
  });

  it('should reset all state', () => {
    wal.beginTransaction('TX1');
    wal.update('TX1', 'inventory', 'item1', '10', '9');
    wal.commit('TX1');

    wal.reset();
    expect(wal.getLog()).toHaveLength(0);
    expect(wal.getState()).toEqual({});
  });
});