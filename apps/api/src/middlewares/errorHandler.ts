// import { Request, Response, NextFunction } from 'express';

// export class ApiError extends Error {
//   statusCode: number;

//   constructor(statusCode: number, message: string) {
//     super(message);
//     this.statusCode = statusCode;
//     Object.setPrototypeOf(this, ApiError.prototype);
//   }
// }

// export function errorHandler(
//   err: Error,
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ): void {
//   if (err instanceof ApiError) {
//     res.status(err.statusCode).json({
//       success: false,
//       error: err.message,
//     });
//     return;
//   }

//   console.error('Unhandled Error:', err.message);

//   res.status(500).json({
//     success: false,
//     error: 'Internal Server Error',
//   });
// }







import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';
import { isProduction } from '../config/env';

/**
 * Centralized Error Handler
 *
 * Catches all errors thrown by route handlers and middleware.
 * Returns consistent, safe JSON error responses.
 * In production, internal error details are hidden.
 */

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle known operational errors
  if (err instanceof ApiError) {
    logger.warn(`${err.statusCode} ${err.message}`, {
      method: req.method,
      path: req.path,
    });

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Validation failed';

    res.status(400).json({
      success: false,
      error: message,
      statusCode: 400,
      details: isProduction ? undefined : err.issues,
    });
    return;
  }

  // Handle JSON parse errors (malformed request body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      statusCode: 400,
    });
    return;
  }

  // Handle PostgreSQL errors
  const pgError = err as any;
  if (pgError.code) {
    // 23505 = unique violation, 23503 = foreign key violation
    if (pgError.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        statusCode: 409,
      });
      return;
    }
    if (pgError.code === '23503') {
      res.status(400).json({
        success: false,
        error: 'Referenced record does not exist',
        statusCode: 400,
      });
      return;
    }
  }

  // Unknown / programming errors
  logger.error('Unhandled error', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: isProduction
      ? 'An unexpected error occurred'
      : err.message || 'Internal Server Error',
    statusCode: 500,
  });
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}