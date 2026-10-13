import { Request, Response, NextFunction } from 'express';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';

/**
 * Partition Inspector Controller
 *
 * Course Mapping: Week 3 - Data Partitioning & Sharding
 *
 * Exposes real PostgreSQL partition metadata and EXPLAIN ANALYZE
 * results so the instructor can verify partitioning is real.
 */

// ==========================================
// GET /api/partitions/list
// Shows all partitioned tables and their partitions
// ==========================================
export async function listPartitions(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Query PostgreSQL catalog for partitioned tables
    const partitionedTables = await pgPool.query(`
      SELECT
        c.relname AS parent_table,
        ps.partstrat AS strategy,
        CASE ps.partstrat
          WHEN 'h' THEN 'HASH'
          WHEN 'r' THEN 'RANGE'
          WHEN 'l' THEN 'LIST'
        END AS strategy_name,
        ps.partnatts AS partition_columns,
        a.attname AS partition_key
      FROM pg_partitioned_table ps
      JOIN pg_class c ON c.oid = ps.partrelid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ps.partattrs::smallint[])
      ORDER BY c.relname
    `);

    // Get all child partitions
    const childPartitions = await pgPool.query(`
      SELECT
        inhparent::regclass::text AS parent_table,
        inhrelid::regclass::text AS partition_name,
        pg_get_expr(c.relpartbound, c.oid) AS partition_bounds
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      ORDER BY inhparent::regclass::text, inhrelid::regclass::text
    `);

    // Count rows per partition
    const rowCounts: Record<string, number> = {};
    for (const p of childPartitions.rows) {
      try {
        const r = await pgPool.query(`SELECT COUNT(*) FROM ${p.partition_name}`);
        rowCounts[p.partition_name] = Number(r.rows[0].count);
      } catch {
        rowCounts[p.partition_name] = -1;
      }
    }

    res.json({
      success: true,
      data: {
        partitionedTables: partitionedTables.rows,
        partitions: childPartitions.rows.map((p) => ({
          ...p,
          rowCount: rowCounts[p.partition_name] ?? 0,
        })),
      },
      explanation: {
        strategy: 'PostgreSQL declarative partitioning. HASH distributes rows by hash(user_id). RANGE partitions by date range.',
        bounds: 'partition_bounds shows the exact hash/range this partition owns.',
        rowCount: 'Current row count per partition. Even distribution = good hash partitioning.',
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/partitions/explain?table=orders&user_id=42
// Shows EXPLAIN output proving partition pruning
// ==========================================
export async function explainPartitionPruning(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { table, user_id } = req.query;

    if (!table || typeof table !== 'string') {
      throw new ApiError(400, 'table query parameter is required');
    }

    let query: string;
    let params: any[] = [];

    if (table === 'orders' && user_id) {
      query = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) SELECT * FROM orders WHERE user_id = $1`;
      params = [Number(user_id)];
    } else if (table === 'orders') {
      query = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) SELECT * FROM orders LIMIT 10`;
    } else if (table === 'order_items' && user_id) {
      query = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) SELECT * FROM order_items WHERE user_id = $1`;
      params = [Number(user_id)];
    } else if (table === 'food_events') {
      // Range pruning demo — query only current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      query = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS) SELECT * FROM food_events WHERE created_at >= $1 AND created_at < $2`;
      params = [monthStart, monthEnd];
    } else {
      throw new ApiError(400, `Unknown table: ${table}`);
    }

    const result = await pgPool.query(query, params);
    const plan = result.rows.map((r) => r['QUERY PLAN']);

    // Detect which partitions were scanned
    const scannedPartitions = plan
      .filter((line) => /orders_p\d+|order_items_p\d+|food_events_\d{4}_\d{2}/.test(line))
      .map((line) => {
        const match = line.match(/(orders_p\d+|order_items_p\d+|food_events_\d{4}_\d{2})/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const uniquePartitions = [...new Set(scannedPartitions)];

    res.json({
      success: true,
      data: {
        table,
        query,
        params,
        plan,
        scannedPartitions: uniquePartitions,
        partitionsPruned: uniquePartitions.length < 4,
      },
      explanation: uniquePartitions.length < 4
        ? `Partition pruning is working! Only ${uniquePartitions.length} partition(s) were scanned instead of all 4. This is the performance benefit of partitioning.`
        : 'No pruning occurred. All partitions were scanned. This happens when no partition key filter is applied.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/partitions/distribution
// Shows how rows are distributed across partitions
// ==========================================
export async function getDistribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tables = ['orders', 'order_items'];
    const distribution: Record<string, Record<string, number>> = {};

    for (const table of tables) {
      distribution[table] = {};
      for (let i = 0; i < 4; i++) {
        const partition = `${table}_p${i}`;
        try {
          const r = await pgPool.query(`SELECT COUNT(*) FROM ${partition}`);
          distribution[table][partition] = Number(r.rows[0].count);
        } catch {
          distribution[table][partition] = 0;
        }
      }
    }

    // Calculate balance ratio (ideal = 1.0)
    const orderCounts = Object.values(distribution.orders);
    const maxOrders = Math.max(...orderCounts);
    const minOrders = Math.min(...orderCounts.filter((c) => c > 0));
    const balanceRatio = minOrders > 0 ? (maxOrders / minOrders).toFixed(2) : 'N/A';

    res.json({
      success: true,
      data: {
        distribution,
        balanceRatio,
        isBalanced: balanceRatio !== 'N/A' && Number(balanceRatio) < 1.5,
      },
      explanation: 'Balance ratio close to 1.0 means hash partitioning is distributing rows evenly. Higher values indicate skew.',
    });
  } catch (error) {
    next(error);
  }
}