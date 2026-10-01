import { z } from 'zod';
import 'dotenv/config';

/**
 * Centralized Environment Configuration
 *
 * Validates all environment variables at startup using Zod.
 * If any required variable is missing or invalid, the process
 * exits immediately with a descriptive error message.
 *
 * This prevents "undefined secret" bugs at runtime.
 */

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // JWT & Auth
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"'),
  JWT_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters.'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters.'),

  // PostgreSQL
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string'
    ),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:19092'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(10),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nFix your .env file and restart.');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export default env;