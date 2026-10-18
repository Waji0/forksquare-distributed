import { describe, it, expect } from 'vitest';
import { RaftCluster } from '../raft';

describe('RaftCluster (Week 12: Consensus Algorithm)', () => {
  it('should elect exactly one leader', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    const result = cluster.runElection();

    expect(result.winner).not.toBeNull();

    const state = cluster.getClusterState();
    const leaders = state.filter((n) => n.state === 'LEADER');
    expect(leaders).toHaveLength(1);
  });

  it('should calculate correct majority for 3 nodes', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    const result = cluster.runElection();
    expect(result.majorityRequired).toBe(2);
  });

  it('should calculate correct majority for 5 nodes', () => {
    const cluster = new RaftCluster(['A', 'B', 'C', 'D', 'E']);
    const result = cluster.runElection();
    expect(result.majorityRequired).toBe(3);
  });

  it('should handle node failures and still elect a leader', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    cluster.killNode('node-A');

    const result = cluster.runElection();
    expect(result.aliveNodes).toBe(2);
    expect(result.winner).not.toBeNull();
  });

  it('should append log entries only through the leader', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    cluster.runElection();

    const result = cluster.appendLog('SET order_1 = CONFIRMED');
    expect(result.success).toBe(true);
    expect(result.entry).not.toBeNull();
    expect(result.entry?.command).toBe('SET order_1 = CONFIRMED');
  });

  it('should fail to append log when no leader exists', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    // No election run — no leader
    const result = cluster.appendLog('SET order_1 = CONFIRMED');
    expect(result.success).toBe(false);
  });

  it('should replicate log entries to all alive followers', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    cluster.runElection();
    cluster.appendLog('SET order_1 = CONFIRMED');

    const state = cluster.getClusterState();
    state.forEach((node) => {
      if (node.isAlive) {
        expect(node.logLength).toBe(1);
      }
    });
  });

  it('should increment term on each election', () => {
    const cluster = new RaftCluster(['node-A', 'node-B', 'node-C']);
    const election1 = cluster.runElection();
    const election2 = cluster.runElection();
    expect(election2.term).toBeGreaterThan(election1.term);
  });
});