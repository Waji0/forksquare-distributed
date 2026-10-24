import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { bloomAdd } from '../services/bloomFilter';
import logger from '../config/logger';

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
});

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const { username, email } = parsed.data;
    const userId = (req as any).user.userId;

    // If nothing to update
    if (!username && !email) {
      throw new ApiError(400, 'No fields provided to update');
    }

    const client = await pgPool.connect();
    try {
      // Fetch current user data
      const currentUser = await client.query(
        'SELECT username, email, is_verified FROM users WHERE id = $1',
        [userId]
      );

      if (currentUser.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const current = currentUser.rows[0];
      const newUsername = username ?? current.username;
      const newEmail = email ?? current.email;
      const isEmailChanging = newEmail !== current.email;
      const isUsernameChanging = newUsername !== current.username;

      // Check email uniqueness if changing
      if (isEmailChanging) {
        const emailCheck = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
        if (emailCheck.rows.length > 0) {
          throw new ApiError(409, 'Email is already in use');
        }
      }

      // Check username uniqueness if changing
      if (isUsernameChanging) {
        const usernameCheck = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [newUsername, userId]);
        if (usernameCheck.rows.length > 0) {
          throw new ApiError(409, 'Username is already taken');
        }
      }

      // If email changes, reset verification status
      const newIsVerified = isEmailChanging ? false : current.is_verified;

      // Update database
      const updateResult = await client.query(
        `UPDATE users 
         SET username = $1, email = $2, is_verified = $3 
         WHERE id = $4 
         RETURNING id, username, email, role, is_verified`,
        [newUsername, newEmail, newIsVerified, userId]
      );

      const updatedUser = updateResult.rows[0];

      // Update Bloom Filter if username changed
      if (isUsernameChanging) {
        await bloomAdd(newUsername);
      }

      logger.info(`Profile updated for user ID: ${userId}`);

      res.json({
        success: true,
        data: {
          user: updatedUser,
          message: isEmailChanging 
            ? 'Profile updated. Please verify your new email address.' 
            : 'Profile updated successfully.',
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}