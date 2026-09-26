import { Request, Response, NextFunction } from 'express';
import { getAnalyticsSummary } from '../services/analytics';

export async function getAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await getAnalyticsSummary();

    res.json({
      success: true,
      data: summary,
      engine: 'ClickHouse (Columnar OLAP)',
    });
  } catch (error) {
    next(error);
  }
}