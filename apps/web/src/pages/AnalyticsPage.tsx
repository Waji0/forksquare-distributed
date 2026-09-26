import { useEffect, useState } from 'react';
import { BarChart3, Database, RefreshCw, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

interface AnalyticsData {
  totalEvents: number;
  eventsByType: Array<{ event_type: string; count: number }>;
  eventsByProcessor: Array<{ processed_by: string; count: number }>;
  totalRevenue: number;
  recentEvents: Array<Record<string, unknown>>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await axios.get('/api/analytics/summary');
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Analytics Dashboard</h1>
          <p className="text-slate-500">
            Powered by <strong>ClickHouse</strong> (Columnar OLAP Database)
          </p>
        </div>
        <button onClick={fetchAnalytics} className="text-slate-600 hover:text-orange-600">
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Events</p>
              <p className="text-2xl font-bold text-slate-900">{data?.totalEvents ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900">
                Rs. {(data?.totalRevenue ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Event Types</p>
              <p className="text-2xl font-bold text-slate-900">{data?.eventsByType.length ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Events by Type */}
      {data && data.eventsByType.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-slate-900">Events by Type</h3>
          <div className="space-y-3">
            {data.eventsByType.map((item) => (
              <div key={item.event_type} className="flex items-center gap-3">
                <span className="w-40 text-sm text-slate-600">{item.event_type.replace(/_/g, ' ')}</span>
                <div className="flex-1">
                  <div className="h-4 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-4 rounded-full ${
                        item.event_type === 'ORDER_CREATED' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (item.count / Math.max(...data.eventsByType.map(e => e.count))) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Events by Processor */}
      {data && data.eventsByProcessor.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-slate-900">Events by Processor</h3>
          <div className="flex flex-wrap gap-3">
            {data.eventsByProcessor.map((item) => (
              <Badge key={item.processed_by} className="bg-slate-50 text-slate-700 ring-slate-200">
                {item.processed_by}: {item.count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Events Table */}
      {data && data.recentEvents.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-semibold text-slate-900">Recent Events (ClickHouse)</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      event.event_type === 'ORDER_CREATED'
                        ? 'bg-green-50 text-green-700 ring-green-200'
                        : 'bg-red-50 text-red-700 ring-red-200'
                    }
                  >
                    {String(event.event_type).replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm text-slate-600">User #{String(event.user_id)}</span>
                </div>
                <span className="text-xs text-slate-400">{String(event.created_at).slice(0, 19)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {data && data.totalEvents === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No analytics data yet</p>
          <p className="mt-1 text-slate-500">
            Place orders or run the flash sale test to generate analytics events.
          </p>
        </div>
      )}
    </div>
  );
}