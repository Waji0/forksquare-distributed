import { Request, Response, NextFunction } from 'express';
import { tracer } from '../services/tracing';
import { ApiError } from '../middlewares/errorHandler';

export function getRecentTraces(req: Request, res: Response, _next: NextFunction): void {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const traces = tracer.getRecentTraces(limit);

  res.json({
    success: true,
    data: traces,
    total: traces.length,
  });
}

export function getTraceById(req: Request, res: Response, next: NextFunction): void {
  try {
    const { traceId } = req.params;
    if (!traceId) throw new ApiError(400, 'traceId is required');

    const trace = tracer.getTrace(traceId);

    if (!trace) {
      throw new ApiError(404, `Trace '${traceId}' not found`);
    }

    res.json({ success: true, data: trace });
  } catch (error) {
    next(error);
  }
}

export function clearTraces(_req: Request, res: Response, _next: NextFunction): void {
  tracer.clear();
  res.json({ success: true, message: 'All traces cleared' });
}