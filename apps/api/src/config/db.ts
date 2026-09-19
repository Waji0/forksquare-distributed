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
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://forksquare:forksquare_secret@localhost:5432/forksquare_orders',
});

export const connectPostgres = async () => {
  try {
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL Connected (Orders & Inventory)');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error);
    process.exit(1);
  }
};

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