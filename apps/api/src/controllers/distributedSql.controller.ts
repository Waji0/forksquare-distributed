import { Request, Response, NextFunction } from 'express';
import { distributedSqlService } from '../services/distributedSql';
import { ApiError } from '../middlewares/errorHandler';

export async function initDistributedSql(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributedSqlService.initialize();
    res.json(result);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return next(new ApiError(503, 'CockroachDB is not running. Start it with docker-compose up -d'));
    }
    next(error);
  }
}

export async function showRanges(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributedSqlService.showRanges();
    res.json(result);
  } catch (error: any) {
    next(error);
  }
}

export async function compareDatabases(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributedSqlService.compareWithPostgres();
    res.json(result);
  } catch (error) {
    next(error);
  }
}