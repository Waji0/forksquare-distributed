import crypto from 'crypto';

/**
 * Distributed Tracing Service
 * 
 * Course Mapping: SHOULD HAVE - "Distributed Tracing (OpenTelemetry)"
 * 
 * Implements the core concepts of distributed tracing:
 * - Trace ID: Unique identifier for an entire request flow
 * - Span ID: Unique identifier for a single operation within the trace
 * - Parent Span: Links child operations to their parent
 * 
 * In production, this would use OpenTelemetry SDK with Jaeger/Zipkin.
 * This implementation demonstrates the concept with in-memory storage.
 */

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number | null;
  durationMs: number | null;
  status: 'RUNNING' | 'COMPLETED' | 'ERROR';
  metadata: Record<string, string>;
}

export interface Trace {
  traceId: string;
  rootOperation: string;
  startTime: number;
  totalSpans: number;
  totalDurationMs: number | null;
  status: 'RUNNING' | 'COMPLETED' | 'ERROR';
  spans: TraceSpan[];
}

export class DistributedTracer {
  private traces: Map<string, TraceSpan[]> = new Map();
  private maxTraces: number = 500;

  /**
   * Generate a unique trace ID (128-bit hex)
   */
  generateTraceId(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }

  /**
   * Generate a unique span ID (64-bit hex)
   */
  generateSpanId(): string {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }

  /**
   * Start a new trace
   */
  startTrace(traceId: string, operationName: string, serviceName: string): TraceSpan {
    const span: TraceSpan = {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId: null,
      operationName,
      serviceName,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
      status: 'RUNNING',
      metadata: {},
    };

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);

    // Trim old traces
    if (this.traces.size > this.maxTraces) {
      const firstKey = this.traces.keys().next().value;
      if (firstKey) this.traces.delete(firstKey);
    }

    return span;
  }

  /**
   * Start a child span within an existing trace
   */
  startChildSpan(
    traceId: string,
    parentSpanId: string,
    operationName: string,
    serviceName: string
  ): TraceSpan {
    const span: TraceSpan = {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId,
      operationName,
      serviceName,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
      status: 'RUNNING',
      metadata: {},
    };

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);

    return span;
  }

  /**
   * End a span
   */
  endSpan(traceId: string, spanId: string, status: 'COMPLETED' | 'ERROR' = 'COMPLETED', metadata?: Record<string, string>): void {
    const spans = this.traces.get(traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      span.status = status;
      if (metadata) {
        span.metadata = { ...span.metadata, ...metadata };
      }
    }
  }

  /**
   * Get a complete trace with all spans
   */
  getTrace(traceId: string): Trace | null {
    const spans = this.traces.get(traceId);
    if (!spans || spans.length === 0) return null;

    const rootSpan = spans.find(s => s.parentSpanId === null);
    const allCompleted = spans.every(s => s.status !== 'RUNNING');
    const hasError = spans.some(s => s.status === 'ERROR');

    return {
      traceId,
      rootOperation: rootSpan?.operationName ?? 'unknown',
      startTime: rootSpan?.startTime ?? spans[0].startTime,
      totalSpans: spans.length,
      totalDurationMs: rootSpan?.durationMs ?? null,
      status: hasError ? 'ERROR' : allCompleted ? 'COMPLETED' : 'RUNNING',
      spans: [...spans].sort((a, b) => a.startTime - b.startTime),
    };
  }

  /**
   * Get all recent traces (summary only)
   */
  getRecentTraces(limit: number = 20): Array<{
    traceId: string;
    rootOperation: string;
    totalSpans: number;
    status: string;
    startTime: number;
  }> {
    const summaries: Array<{
      traceId: string;
      rootOperation: string;
      totalSpans: number;
      status: string;
      startTime: number;
    }> = [];

    for (const [traceId, spans] of this.traces.entries()) {
      const rootSpan = spans.find(s => s.parentSpanId === null);
      const allCompleted = spans.every(s => s.status !== 'RUNNING');
      const hasError = spans.some(s => s.status === 'ERROR');

      summaries.push({
        traceId,
        rootOperation: rootSpan?.operationName ?? 'unknown',
        totalSpans: spans.length,
        status: hasError ? 'ERROR' : allCompleted ? 'COMPLETED' : 'RUNNING',
        startTime: rootSpan?.startTime ?? spans[0]?.startTime ?? 0,
      });
    }

    return summaries
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
  }
}

// Global tracer instance
export const tracer = new DistributedTracer();