import { Request, Response, NextFunction } from 'express';
import { executeSemiJoin, executeBloomJoin, compareJoinStrategies } from '../services/distributedJoin';

export async function runSemiJoin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await executeSemiJoin();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function runBloomJoin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await executeBloomJoin();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export function getJoinComparison(_req: Request, res: Response, _next: NextFunction): void {
  res.json({
    success: true,
    data: compareJoinStrategies(),
  });
}