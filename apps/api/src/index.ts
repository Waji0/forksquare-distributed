import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import { connectMongo, connectPostgres, redisClient, pgPool } from './config/db';
import { initPostgresTables } from './config/initPostgres';

const app = express();

app.use(cors());
app.use(express.json());

// Advanced Health Check Endpoint
app.get('/api/health', async (_req, res) => {
  let pgStatus = 'down';
  let mongoStatus = 'down';
  let redisStatus = 'down';

  // 1. Check Postgres
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    pgStatus = 'up';
  } catch (e) { /* ignore */ }

  // 2. Check Mongo
  try {
    if (mongoose.connection.readyState === 1) mongoStatus = 'up';
  } catch (e) { /* ignore */ }

  // 3. Check Redis
  try {
    if (redisClient.status === 'ready') redisStatus = 'up';
  } catch (e) { /* ignore */ }

  res.json({
    status: 'ok',
    service: 'forksquare-api',
    timestamp: new Date().toISOString(),
    databases: {
      postgres_orders: pgStatus,
      mongo_menus: mongoStatus,
      redis_cache: redisStatus,
    }
  });
});

const port = Number(process.env.PORT ?? 4000);

async function startServer() {
  // Connect to all databases
  await connectMongo();
  await connectPostgres();
  await initPostgresTables();
  
  // Wait for Redis to be ready
  await new Promise<void>((resolve) => {
    if (redisClient.status === 'ready') resolve();
    else redisClient.on('ready', () => resolve());
  });

  app.listen(port, () => {
    console.log(`🚀 ForkSquare API is running on http://localhost:${port}`);
  });
}

startServer();