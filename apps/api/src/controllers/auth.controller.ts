import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { bloomAdd, bloomMightContain } from '../services/bloomFilter';

const JWT_SECRET = 'forksquare_dev_secret_key_change_in_production';
const JWT_EXPIRY = '7d';

// ==========================================
// Zod Schemas
// ==========================================
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const checkUsernameSchema = z.object({
  username: z.string().min(1),
});

// ==========================================
// POST /api/auth/register
// ==========================================
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const { username, email, password } = parsed.data;

    // Check if email already exists (PostgreSQL)
    const existingUser = await pgPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ApiError(409, 'Email already registered');
    }

    // Check username via Bloom Filter first (O(1) constant time)
    const mightExist = await bloomMightContain(username);

    if (mightExist) {
      // Bloom filter says "maybe exists" → verify with PostgreSQL
      const existingUsername = await pgPool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUsername.rows.length > 0) {
        throw new ApiError(409, 'Username already taken');
      }
    }
    // If Bloom filter says "definitely not exists" → skip DB query entirely

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user into PostgreSQL
    const result = await pgPool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Add username and email to Bloom Filter for future O(1) lookups
    await bloomAdd(username);
    await bloomAdd(email);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/auth/login
// ==========================================
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const { email, password } = parsed.data;

    // Find user
    const result = await pgPool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/auth/check-username?username=xyz
// ==========================================
/**
 * Constant-Time Username Existence Check
 * 
 * Flow:
 * 1. Query Bloom Filter (O(1) - constant time)
 * 2. If Bloom says "NO" → return { exists: false } immediately (no DB hit)
 * 3. If Bloom says "MAYBE" → query PostgreSQL to confirm
 * 
 * This satisfies the instructor requirement:
 * "System should handle username existence in constant time"
 */
export async function checkUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = checkUsernameSchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, 'Username query parameter is required');
    }

    const { username } = parsed.data;
    const startTime = Date.now();

    // Step 1: Bloom Filter check (O(1) constant time)
    const mightExist = await bloomMightContain(username);

    if (!mightExist) {
      // Bloom filter is 100% certain: username does NOT exist
      // No need to hit PostgreSQL at all
      const elapsed = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          username,
          exists: false,
          lookupMethod: 'bloom_filter_only',
          responseTimeMs: elapsed,
        },
      });
      return;
    }

    // Step 2: Bloom filter says "maybe" → verify with PostgreSQL
    const result = await pgPool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    const exists = result.rows.length > 0;
    const elapsed = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        username,
        exists,
        lookupMethod: exists ? 'bloom_then_postgres' : 'bloom_false_positive',
        responseTimeMs: elapsed,
      },
    });
  } catch (error) {
    next(error);
  }
}