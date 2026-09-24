import { Request, Response, NextFunction } from 'express';
import { pgPool } from '../config/db';

export async function getEventLogs(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pgPool.query(
      'SELECT * FROM event_logs ORDER BY processed_at DESC LIMIT 20'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}