import { clickhouseClient } from '../config/clickhouse';

/**
 * Analytics Service
 * Writes aggregated data to ClickHouse for fast OLAP queries.
 * 
 * Course Mapping: Module 4 - Columnar storage paradigm
 */

export interface AnalyticsEvent {
  event_type: string;
  user_id: number;
  order_id?: number;
  total_amount?: number;
  processed_by: string;
  status?: string;
}

export async function insertAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await clickhouseClient.insert({
      table: 'order_analytics',
      values: [
        {
          event_type: event.event_type,
          user_id: event.user_id,
          order_id: event.order_id ?? null,
          total_amount: event.total_amount ?? 0,
          processed_by: event.processed_by,
          status: event.status ?? 'COMPLETED',
        },
      ],
      format: 'JSONEachRow',
    });
  } catch (error) {
    console.error('❌ ClickHouse insert error:', error);
  }
}

export async function getAnalyticsSummary(): Promise<{
  totalEvents: number;
  eventsByType: Array<{ event_type: string; count: number }>;
  eventsByProcessor: Array<{ processed_by: string; count: number }>;
  totalRevenue: number;
  recentEvents: Array<Record<string, unknown>>;
}> {
  try {
    const [totalRes, typeRes, processorRes, revenueRes, recentRes] = await Promise.all([
      clickhouseClient.query({
        query: 'SELECT count() as total FROM order_analytics',
        format: 'JSONEachRow',
      }),
      clickhouseClient.query({
        query: `SELECT event_type, count() as count 
                FROM order_analytics 
                GROUP BY event_type 
                ORDER BY count DESC`,
        format: 'JSONEachRow',
      }),
      clickhouseClient.query({
        query: `SELECT processed_by, count() as count 
                FROM order_analytics 
                GROUP BY processed_by 
                ORDER BY count DESC`,
        format: 'JSONEachRow',
      }),
      clickhouseClient.query({
        query: `SELECT sum(total_amount) as total_revenue 
                FROM order_analytics 
                WHERE status = 'COMPLETED'`,
        format: 'JSONEachRow',
      }),
      clickhouseClient.query({
        query: `SELECT event_type, user_id, order_id, total_amount, processed_by, created_at 
                FROM order_analytics 
                ORDER BY created_at DESC 
                LIMIT 20`,
        format: 'JSONEachRow',
      }),
    ]);

    const [totalRows, typeRows, processorRows, revenueRows, recentRows] = await Promise.all([
      totalRes.json(),
      typeRes.json(),
      processorRes.json(),
      revenueRes.json(),
      recentRes.json(),
    ]);

    return {
      totalEvents: Number((totalRows as any[])[0]?.total ?? 0),
      eventsByType: (typeRows as any[]).map(r => ({
        event_type: r.event_type,
        count: Number(r.count),
      })),
      eventsByProcessor: (processorRows as any[]).map(r => ({
        processed_by: r.processed_by,
        count: Number(r.count),
      })),
      totalRevenue: Number((revenueRows as any[])[0]?.total_revenue ?? 0),
      recentEvents: recentRows as Array<Record<string, unknown>>,
    };
  } catch (error) {
    console.error('❌ ClickHouse query error:', error);
    return {
      totalEvents: 0,
      eventsByType: [],
      eventsByProcessor: [],
      totalRevenue: 0,
      recentEvents: [],
    };
  }
}