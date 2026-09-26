import { createClient, ClickHouseClient } from '@clickhouse/client';

/**
 * ClickHouse Configuration (Columnar Database)
 * 
 * Course Mapping: Module 4 - "NoSQL(Key-Value, Document, Columnar)"
 * Instructor Hint: "stats related things like dashboards → columnar database"
 * 
 * ClickHouse is optimized for OLAP (analytical) queries:
 * - Column-oriented storage for fast aggregations
 * - Vectorized query execution
 * - Compression for time-series data
 */

export const clickhouseClient: ClickHouseClient = createClient({
  host: 'http://localhost:8123',
  username: 'default',
  password: '',
});

export async function initClickHouse(): Promise<void> {
  try {
    await clickhouseClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS order_analytics (
          event_id UUID DEFAULT generateUUIDv4(),
          event_type LowCardinality(String),
          user_id UInt32,
          order_id Nullable(UInt32),
          total_amount Decimal(10, 2) DEFAULT 0,
          processed_by LowCardinality(String),
          status LowCardinality(String) DEFAULT 'COMPLETED',
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (created_at, event_type)
        TTL created_at + INTERVAL 90 DAY;
      `,
    });
    console.log('✅ ClickHouse Tables Initialized (Columnar Analytics)');
  } catch (error) {
    console.error('❌ ClickHouse Init Error:', error);
  }
}

export async function disconnectClickHouse(): Promise<void> {
  await clickhouseClient.close();
}