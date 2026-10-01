import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import { connectMongo, connectPostgres, redisClient, pgPool } from './config/db';
import { initPostgresTables } from './config/initPostgres';
import { initClickHouse } from './config/clickhouse';
import { initNeo4j } from './config/neo4j';
import { errorHandler } from './middlewares/errorHandler';
import { connectKafka } from './config/kafka';
import { startConsumers } from './workers/eventConsumers';
import routes from './routes';

import { tracingMiddleware } from './middlewares/tracing';
import path from 'path';



const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(tracingMiddleware);

// Health Check
app.get('/api/health', async (_req, res) => {
  let pgStatus = 'down';
  let mongoStatus = 'down';
  let redisStatus = 'down';

  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    pgStatus = 'up';
  } catch { pgStatus = 'down'; }

  if (mongoose.connection.readyState === 1) mongoStatus = 'up';
  if (redisClient.status === 'ready') redisStatus = 'up';

  res.json({
    status: 'ok',
    service: 'forksquare-api',
    timestamp: new Date().toISOString(),
    databases: {
      postgres_orders: pgStatus,
      mongo_menus: mongoStatus,
      redis_cache: redisStatus,
    },
  });
});

app.use('/api', routes);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);

async function startServer() {
  await connectMongo();
  await connectPostgres();
  await initPostgresTables();
  await initClickHouse();
  await initNeo4j();

  await new Promise<void>((resolve) => {
    if (redisClient.status === 'ready') resolve();
    else redisClient.on('ready', () => resolve());
  });

  await connectKafka();
  await startConsumers();

  app.listen(port, () => {
    console.log(`🚀 ForkSquare API running on http://localhost:${port}`);
    console.log('');
    console.log('📡 API Routes:');
    console.log('   GET  /api/health');
    console.log('   POST /api/auth/register');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/auth/check-username');
    console.log('   GET  /api/restaurants');
    console.log('   POST /api/orders');
    console.log('   POST /api/flash-sale/buy');
    console.log('   GET  /api/similar/search');
    console.log('   GET  /api/analytics/summary');
    console.log('   GET  /api/graph');
    console.log('   GET  /api/graph/by-cuisine');
    console.log('   GET  /api/system/stats');
    console.log('   GET  /api/events/logs');
  });
}

startServer();