import winston from 'winston';
import morgan, { type StreamOptions } from 'morgan';
import { env, isDevelopment } from './env';

/**
 * Centralized Logger (Winston + Morgan)
 *
 * - Winston handles application logs (info, warn, error, debug)
 * - Morgan captures HTTP request/response logs and pipes them to Winston
 * - In development: colored, human-readable console output
 * - In production: structured JSON output (for log aggregators)
 */

// Define log format based on environment
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'forksquare-api' },
  transports: [
    // Console transport (always active)
    new winston.transports.Console(),
  ],
});

// In production, also write to files
if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Morgan stream that forwards HTTP logs to Winston
const morganStream: StreamOptions = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Use 'dev' format in development, 'combined' in production
export const httpLogger = morgan(isDevelopment ? 'dev' : 'combined', {
  stream: morganStream,
  // Skip logging health checks to reduce noise
  skip: (req) => req.url === '/api/health',
});

export default logger;