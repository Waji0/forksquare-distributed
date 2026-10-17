import { cockroachPool } from '../config/db';

/**
 * Distributed SQL Service (CockroachDB)
 * 
 * Course Mapping: Week 16 - "Distributed SQL databases; NewSQL paradigm"
 * 
 * Unlike PostgreSQL where we manually defined PARTITION BY HASH,
 * CockroachDB automatically splits data into "Ranges" (shards) 
 * and replicates them using Raft consensus.
 */

export class DistributedSqlService {
  /**
   * Initialize a table and seed it with data
   */
  async initialize() {
    const client = await cockroachPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS distributed_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          total_amount DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT now()
        )
      `);
      
      // Insert sample data to populate ranges
      for (let i = 1; i <= 50; i++) {
        await client.query(
          `INSERT INTO distributed_orders (user_id, status, total_amount) VALUES ($1, $2, $3)`,
          [i, 'CONFIRMED', Math.floor(Math.random() * 2000) + 100]
        );
      }
      return { success: true, message: 'CockroachDB table initialized and seeded with 50 orders.' };
    } finally {
      client.release();
    }
  }

    /**
   * Show automatic sharding (Ranges)
   */
  async showRanges() {
    const client = await cockroachPool.connect();
    try {
      // SHOW RANGES demonstrates how CockroachDB automatically shards data.
      // This single command returns range_id, start_key, end_key, range_size_mb, 
      // lease_holder, and replicas for every shard in the table.
      const ranges = await client.query('SHOW RANGES FROM TABLE distributed_orders');

      return {
        success: true,
        data: {
          ranges: ranges.rows,
          totalRanges: ranges.rows.length,
        },
        explanation: 'CockroachDB automatically splits the table into "Ranges" based on the primary key. Each range is a distinct shard that can be moved between nodes independently. This is automatic sharding — no manual PARTITION BY required.',
      };
    } finally {
      client.release();
    }
  }

  /**
   * Compare PostgreSQL (Manual) vs CockroachDB (Automatic)
   */
  async compareWithPostgres() {
    return {
      success: true,
      data: {
        postgresql: {
          type: 'Traditional RDBMS (Vertical Scaling)',
          sharding: 'Manual (Declarative Partitioning - Phase 2)',
          replication: 'Manual (Streaming Replication - Phase 1)',
          consistency: 'Strong (Single Primary)',
          scaling: 'Read replicas scale reads, but writes bottleneck at primary',
        },
        cockroachdb: {
          type: 'Distributed SQL / NewSQL (Horizontal Scaling)',
          sharding: 'Automatic (Ranges split by primary key)',
          replication: 'Automatic (Raft consensus per range)',
          consistency: 'Strong (Serializable isolation across nodes)',
          scaling: 'Scale out by adding nodes; writes distributed automatically',
        },
      },
      courseNote: 'Week 16: Distributed SQL databases combine the horizontal scalability of NoSQL with the ACID guarantees of traditional SQL.',
    };
  }
}

export const distributedSqlService = new DistributedSqlService();