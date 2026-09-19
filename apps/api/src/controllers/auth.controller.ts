import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';

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

    // Check if email already exists
    const existingUser = await pgPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ApiError(409, 'Email already registered');
    }

    // Check if username already exists
    const existingUsername = await pgPool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      throw new ApiError(409, 'Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await pgPool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

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
export async function checkUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = checkUsernameSchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, 'Username query parameter is required');
    }

    const { username } = parsed.data;

    const result = await pgPool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    res.json({
      success: true,
      data: {
        username,
        exists: result.rows.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
}