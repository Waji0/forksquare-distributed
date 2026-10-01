// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import { ApiError } from './errorHandler';

// const JWT_SECRET = 'forksquare_dev_secret_key_change_in_production';

// /**
//  * JWT Authentication Middleware
//  * 
//  * Verifies the Bearer token from the Authorization header.
//  * If valid, attaches the decoded user to req.user.
//  * If invalid, throws 401/403 error.
//  */

// export interface JwtPayload {
//   userId: number;
//   email: string;
// }

// export interface AuthenticatedRequest extends Request {
//   user?: JwtPayload;
// }

// export function authenticateToken(
//   req: AuthenticatedRequest,
//   _res: Response,
//   next: NextFunction
// ): void {
//   const authHeader = req.headers['authorization'];

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     throw new ApiError(401, 'Authentication required. Provide a Bearer token.');
//   }

//   const token = authHeader.split(' ')[1];

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     req.user = decoded;
//     next();
//   } catch {
//     throw new ApiError(403, 'Invalid or expired authentication token.');
//   }
// }

// /**
//  * Optional auth — does not block, but attaches user if token is present
//  */
// export function optionalAuth(
//   req: AuthenticatedRequest,
//   _res: Response,
//   next: NextFunction
// ): void {
//   const authHeader = req.headers['authorization'];

//   if (authHeader && authHeader.startsWith('Bearer ')) {
//     const token = authHeader.split(' ')[1];
//     try {
//       const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
//       req.user = decoded;
//     } catch {
//       // Token invalid, but we don't block
//     }
//   }

//   next();
// }



import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './errorHandler';

/**
 * JWT Authentication Middleware
 *
 * Verifies the Bearer token from the Authorization header.
 * Attaches the decoded payload (userId, email, role) to req.user.
 *
 * Phase 0 enhancements:
 * - Secret loaded from environment (not hardcoded)
 * - Role included in JWT payload for RBAC
 * - Proper 401 vs 403 distinction
 */

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Require a valid access token. Blocks the request if missing/invalid.
 */
export function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required. Provide a Bearer token.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Ensure this is an access token, not a refresh token
    if (decoded.type && decoded.type !== 'access') {
      throw new ApiError(401, 'Invalid token type. Access token required.');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token expired. Please refresh your session.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(403, 'Invalid authentication token.');
    }
    throw error;
  }
}

/**
 * Optional authentication. Does not block, but attaches user if token is valid.
 * Useful for endpoints that behave differently for authenticated users.
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      if (!decoded.type || decoded.type === 'access') {
        req.user = decoded;
      }
    } catch {
      // Token invalid, but we don't block the request
    }
  }

  next();
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: {
  userId: number;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY as any }
  );
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: {
  userId: number;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY as any }
  );
}