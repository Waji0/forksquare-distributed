/**
 * Read Replica Simulation Service
 * 
 * Course Mapping: Week 4 - "Single-leader (active-passive), multi-leader, 
 * and leaderless replication; synchronous vs. asynchronous replication trade-offs"
 * 
 * In production, read replicas are separate database servers that receive
 * replicated data from the primary. Reads go to replicas, writes go to primary.
 * 
 * This service SIMULATES the read/write split pattern by tracking which
 * "node" would handle each query.
 */

export interface ReplicaNode {
  id: string;
  role: 'PRIMARY' | 'REPLICA';
  region: string;
  replicationLagMs: number;
  isHealthy: boolean;
  queriesHandled: number;
}

export interface ReadWriteSplitResult {
  operation: string;
  targetNode: string;
  nodeRole: string;
  reason: string;
}

export class ReadReplicaManager {
  private nodes: ReplicaNode[] = [
    { id: 'pg-primary-01', role: 'PRIMARY', region: 'us-east-1', replicationLagMs: 0, isHealthy: true, queriesHandled: 0 },
    { id: 'pg-replica-01', role: 'REPLICA', region: 'us-west-2', replicationLagMs: 15, isHealthy: true, queriesHandled: 0 },
    { id: 'pg-replica-02', role: 'REPLICA', region: 'eu-west-1', replicationLagMs: 45, isHealthy: true, queriesHandled: 0 },
    { id: 'pg-replica-03', role: 'REPLICA', region: 'ap-south-1', replicationLagMs: 80, isHealthy: true, queriesHandled: 0 },
  ];

  private replicaIndex: number = 0;

  /**
   * Route a query to the appropriate node
   */
  routeQuery(operation: 'READ' | 'WRITE', _query: string): ReadWriteSplitResult {
    if (operation === 'WRITE') {
      // ALL writes go to PRIMARY
      const primary = this.nodes.find(n => n.role === 'PRIMARY');
      if (primary) {
        primary.queriesHandled++;
        return {
          operation,
          targetNode: primary.id,
          nodeRole: primary.role,
          reason: 'All writes MUST go to the PRIMARY node to ensure consistency. The primary then replicates changes to replicas.',
        };
      }
      return { operation, targetNode: 'UNKNOWN', nodeRole: 'ERROR', reason: 'No primary node found' };
    }

    // READS are load-balanced across replicas using Round-Robin
    const healthyReplicas = this.nodes.filter(n => n.role === 'REPLICA' && n.isHealthy);

    if (healthyReplicas.length === 0) {
      // Fallback to primary if all replicas are down
      const primary = this.nodes.find(n => n.role === 'PRIMARY');
      if (primary) {
        primary.queriesHandled++;
        return {
          operation,
          targetNode: primary.id,
          nodeRole: 'PRIMARY (FALLBACK)',
          reason: 'All replicas are down. Falling back to PRIMARY for reads. This increases primary load.',
        };
      }
      return { operation, targetNode: 'UNKNOWN', nodeRole: 'ERROR', reason: 'No healthy nodes' };
    }

    // Round-robin selection
    const replica = healthyReplicas[this.replicaIndex % healthyReplicas.length];
    replica.queriesHandled++;
    this.replicaIndex++;

    return {
      operation,
      targetNode: replica.id,
      nodeRole: replica.role,
      reason: `Read routed to replica via Round-Robin load balancing. Replication lag: ${replica.replicationLagMs}ms. Data may be slightly stale (eventual consistency).`,
    };
  }

  /**
   * Simulate a replica failure
   */
  killReplica(replicaId: string): boolean {
    const replica = this.nodes.find(n => n.id === replicaId);
    if (replica) {
      replica.isHealthy = false;
      return true;
    }
    return false;
  }

  /**
   * Recover a replica
   */
  recoverReplica(replicaId: string): boolean {
    const replica = this.nodes.find(n => n.id === replicaId);
    if (replica) {
      replica.isHealthy = true;
      return true;
    }
    return false;
  }

  /**
   * Get cluster topology
   */
  getTopology(): {
    nodes: ReplicaNode[];
    totalReads: number;
    totalWrites: number;
    replicationStrategy: string;
  } {
    const primary = this.nodes.find(n => n.role === 'PRIMARY');
    const replicas = this.nodes.filter(n => n.role === 'REPLICA');

    return {
      nodes: this.nodes,
      totalReads: replicas.reduce((sum, r) => sum + r.queriesHandled, 0),
      totalWrites: primary?.queriesHandled ?? 0,
      replicationStrategy: 'Single-Leader (Active-Passive) with Asynchronous Replication',
    };
  }

  /**
   * Reset query counters
   */
  resetCounters(): void {
    for (const node of this.nodes) {
      node.queriesHandled = 0;
      node.isHealthy = true;
    }
    this.replicaIndex = 0;
  }
}

// Global instance
export const replicaManager = new ReadReplicaManager();