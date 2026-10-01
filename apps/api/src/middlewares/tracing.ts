import { Response, NextFunction } from 'express';
import { tracer } from '../services/tracing';
import { AuthenticatedRequest } from './auth';

/**
 * Tracing Middleware
 * Attaches a trace ID to every incoming request.
 * The trace ID is returned in the response headers for correlation.
 */
export function tracingMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const traceId = (req.headers['x-trace-id'] as string) || tracer.generateTraceId();
  const operationName = `${req.method} ${req.path}`;
  const serviceName = 'forksquare-api';

  const span = tracer.startTrace(traceId, operationName, serviceName);

  // Attach trace info to request
  (req as any).traceId = traceId;
  (req as any).spanId = span.spanId;

  // Set trace ID in response headers
  res.setHeader('X-Trace-Id', traceId);
  res.setHeader('X-Span-Id', span.spanId);

  // End span when response is finished
  res.on('finish', () => {
    const status = res.statusCode >= 400 ? 'ERROR' : 'COMPLETED';
    tracer.endSpan(traceId, span.spanId, status, {
      httpMethod: req.method,
      httpPath: req.path,
      httpStatus: res.statusCode.toString(),
    });
  });

  next();
}