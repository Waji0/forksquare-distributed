import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { pgPool, pgReplicaPool } from '../config/db';

/**
 * Prometheus Metrics Service
 * Exposes application metrics for Prometheus to scrape.
 */

// Create a custom registry
export const register = new client.Registry();

// Add default metrics (CPU, Memory, Event Loop lag)
client.collectDefaultMetrics({ register });

// ==========================================
// Custom Metrics
// ==========================================

// 1. HTTP Request Duration (Histogram)
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// 2. Total HTTP Requests (Counter)
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// 3. Database Connection Pool Usage (Gauge)
export const dbPoolActiveConnections = new client.Gauge({
  name: 'db_pool_active_connections',
  help: 'Number of active PostgreSQL connections in the pool',
  labelNames: ['pool'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(dbPoolActiveConnections);

// ==========================================
// Express Middleware to track HTTP requests automatically
// ==========================================
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ignore metrics endpoint itself to avoid infinite loops
  if (req.path === '/metrics') return next();

  const end = httpRequestDuration.startTimer();
  
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { 
      route, 
      method: req.method, 
      status_code: res.statusCode.toString() 
    };
    
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
};

// ==========================================
// Background task to update Pool Gauges
// ==========================================
export function startMetricsUpdater() {
  setInterval(() => {
    dbPoolActiveConnections.set({ pool: 'primary' }, pgPool.totalCount - pgPool.idleCount);
    if (pgReplicaPool) {
      dbPoolActiveConnections.set({ pool: 'replica' }, pgReplicaPool.totalCount - pgReplicaPool.idleCount);
    }
  }, 5000); // Update every 5 seconds
}