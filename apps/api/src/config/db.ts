import mongoose from 'mongoose';
import { Pool } from 'pg';
import Redis from 'ioredis';
import 'dotenv/config';

// ==========================================
// 1. MongoDB Connection (Document DB)
// ==========================================
export const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/forksquare_menus');
    console.log('✅ MongoDB Connected (Menus & Restaurants)');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// ==========================================
// 2. PostgreSQL Connection (Relational DB)
// ==========================================

// ==========================================
// PostgreSQL PRIMARY (all WRITES)
// ==========================================
export const pgPool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://forksquare:forksquare_secret@localhost:5432/forksquare_orders',
  max: 20,
});

// Prevent app crash if primary connection drops unexpectedly
pgPool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL PRIMARY client:', err.message);
});

// ==========================================
// PostgreSQL STANDBY (READ-only replica) — Phase 1
// ==========================================
export const pgReplicaPool = new Pool({
  connectionString:
    process.env.DATABASE_REPLICA_URL ||
    'postgresql://forksquare:forksquare_secret@localhost:5433/forksquare_orders',
  max: 10,
});

// Prevent app crash if standby connection drops unexpectedly
pgReplicaPool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL STANDBY client:', err.message);
});

/**
 * Read/Write Split helpers
 *
 * Course Mapping: Week 4 - Single-leader (active-passive) replication.
 * Writes ALWAYS go to the primary. Reads go to the standby.
 */
export function getWritePool(): Pool {
  return pgPool;
}

export function getReadPool(): Pool {
  return pgReplicaPool;
}

export const connectPostgres = async () => {
  try {
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL PRIMARY Connected (writes)');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL Primary Connection Error:', error);
    process.exit(1);
  }
};

/**
 * Connect to the standby. Non-fatal if unavailable,
 * so the app still runs if the standby is down.
 */
export const connectPostgresReplica = async () => {
  try {
    const client = await pgReplicaPool.connect();
    const result = await client.query('SELECT pg_is_in_recovery() AS is_standby');
    const isStandby = result.rows[0].is_standby;
    console.log(
      `✅ PostgreSQL STANDBY Connected (reads) — in_recovery=${isStandby}`
    );
    client.release();
  } catch (error) {
    console.warn('⚠️  PostgreSQL standby not available. Reads will fall back to primary.');
  }
};

// export const pgPool = new Pool({
//   connectionString: process.env.DATABASE_URL || 'postgresql://forksquare:forksquare_secret@localhost:5432/forksquare_orders',
// });

// export const connectPostgres = async () => {
//   try {
//     const client = await pgPool.connect();
//     console.log('✅ PostgreSQL Connected (Orders & Inventory)');
//     client.release();
//   } catch (error) {
//     console.error('❌ PostgreSQL Connection Error:', error);
//     process.exit(1);
//   }
// };

// ==========================================
// 3. Redis Connection (In-Memory Key-Value)
// ==========================================
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected (Cache & Locks)');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});

// ==========================================
// CockroachDB (Distributed SQL) — Phase 5
// ==========================================
// CockroachDB speaks the PostgreSQL wire protocol, so we use the `pg` library.
export const cockroachPool = new Pool({
  connectionString: 'postgresql://root@localhost:26257/defaultdb',
  max: 5,
});

cockroachPool.on('error', (err) => {
  console.error('❌ Unexpected error on idle CockroachDB client:', err.message);
});

export const connectCockroachDB = async () => {
  try {
    const client = await cockroachPool.connect();
    console.log('✅ CockroachDB Connected (Distributed SQL)');
    client.release();
  } catch (error) {
    console.warn('⚠️  CockroachDB not available. Distributed SQL demos will be skipped.');
  }
};