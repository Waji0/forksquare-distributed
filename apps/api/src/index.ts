// import express from 'express';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import 'dotenv/config';
// import { connectMongo, connectPostgres, redisClient, pgPool } from './config/db';
// import { initPostgresTables } from './config/initPostgres';
// import { initClickHouse } from './config/clickhouse';
// import { initNeo4j } from './config/neo4j';
// import { errorHandler } from './middlewares/errorHandler';
// import { connectKafka } from './config/kafka';
// import { startConsumers } from './workers/eventConsumers';
// import routes from './routes';

// import { tracingMiddleware } from './middlewares/tracing';
// import path from 'path';



// const app = express();

// app.use(cors());
// app.use(express.json());

// // Serve uploaded files statically
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// app.use(tracingMiddleware);

// // Health Check
// app.get('/api/health', async (_req, res) => {
//   let pgStatus = 'down';
//   let mongoStatus = 'down';
//   let redisStatus = 'down';

//   try {
//     const client = await pgPool.connect();
//     await client.query('SELECT 1');
//     client.release();
//     pgStatus = 'up';
//   } catch { pgStatus = 'down'; }

//   if (mongoose.connection.readyState === 1) mongoStatus = 'up';
//   if (redisClient.status === 'ready') redisStatus = 'up';

//   res.json({
//     status: 'ok',
//     service: 'forksquare-api',
//     timestamp: new Date().toISOString(),
//     databases: {
//       postgres_orders: pgStatus,
//       mongo_menus: mongoStatus,
//       redis_cache: redisStatus,
//     },
//   });
// });

// app.use('/api', routes);
// app.use(errorHandler);

// const port = Number(process.env.PORT ?? 4000);

// async function startServer() {
//   await connectMongo();
//   await connectPostgres();
//   await initPostgresTables();
//   await initClickHouse();
//   await initNeo4j();

//   await new Promise<void>((resolve) => {
//     if (redisClient.status === 'ready') resolve();
//     else redisClient.on('ready', () => resolve());
//   });

//   await connectKafka();
//   await startConsumers();

//   app.listen(port, () => {
//     console.log(`🚀 ForkSquare API running on http://localhost:${port}`);
//     console.log('');
//     console.log('📡 API Routes:');
//     console.log('   GET  /api/health');
//     console.log('   POST /api/auth/register');
//     console.log('   POST /api/auth/login');
//     console.log('   GET  /api/auth/check-username');
//     console.log('   GET  /api/restaurants');
//     console.log('   POST /api/orders');
//     console.log('   POST /api/flash-sale/buy');
//     console.log('   GET  /api/similar/search');
//     console.log('   GET  /api/analytics/summary');
//     console.log('   GET  /api/graph');
//     console.log('   GET  /api/graph/by-cuisine');
//     console.log('   GET  /api/system/stats');
//     console.log('   GET  /api/events/logs');
//   });
// }

// startServer();



import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';

import { env, isProduction } from './config/env';
import logger, { httpLogger } from './config/logger';
import { connectMongo, connectPostgres, redisClient, pgPool } from './config/db';
import { initPostgresTables } from './config/initPostgres';
import { initClickHouse } from './config/clickhouse';
import { initNeo4j } from './config/neo4j';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { tracingMiddleware } from './middlewares/tracing';
import { startConsumers } from './workers/eventConsumers';
import routes from './routes';
import { connectKafka, disconnectKafka } from './config/kafka';

const app = express();

// ==========================================
// SECURITY MIDDLEWARE (order matters)
// ==========================================

// 1. HTTP request logging (first, to capture all requests)
app.use(httpLogger);

// 2. Helmet: sets secure HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// 3. CORS: restrict allowed origins
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
  })
);

// 4. Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 6. General rate limiter (applies to all /api routes)
const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});
app.use('/api', generalLimiter);

// 7. Stricter rate limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 8. Distributed tracing
app.use(tracingMiddleware);

// ==========================================
// HEALTH CHECK (no auth, no rate limit issues)
// ==========================================
app.get('/api/health', async (_req, res) => {
  let pgStatus = 'down';
  let mongoStatus = 'down';
  let redisStatus = 'down';

  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    pgStatus = 'up';
  } catch {
    pgStatus = 'down';
  }

  if (mongoose.connection.readyState === 1) mongoStatus = 'up';
  if (redisClient.status === 'ready') redisStatus = 'up';

  const allUp = pgStatus === 'up' && mongoStatus === 'up' && redisStatus === 'up';

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'ok' : 'degraded',
    service: 'forksquare-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    databases: {
      postgres_orders: pgStatus,
      mongo_menus: mongoStatus,
      redis_cache: redisStatus,
    },
  });
});

// ==========================================
// API ROUTES
// ==========================================
app.use('/api', routes);

// ==========================================
// 404 + ERROR HANDLING (must be last)
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================
const port = env.PORT;

async function startServer() {
  try {
    logger.info('Starting ForkSquare API...');

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
      logger.info(`🚀 ForkSquare API running on http://localhost:${port}`);
      logger.info(`   Environment: ${env.NODE_ENV}`);
      logger.info(`   Security: helmet ✓ | rate-limit ✓ | CORS ✓ | RBAC ✓`);
      logger.info(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

startServer();