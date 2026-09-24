import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import axios from 'axios';

interface EventLog {
  id: number;
  event_type: string;
  processed_by: string;
  processed_at: string;
  payload: any;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await axios.get('/api/events/logs');
      setLogs(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Activity (Event Stream)</h1>
          <p className="text-slate-500">
            Asynchronous events processed by Kafka/Redpanda background workers.
          </p>
        </div>
        <button onClick={fetchLogs} className="text-slate-600 hover:text-orange-600">
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No events yet. Place an order to see the event stream!
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <Activity className={`h-5 w-5 ${
                    log.event_type === 'ORDER_CREATED' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className="font-semibold text-slate-900">{log.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500">
                      Processed by: <span className="font-mono font-bold text-orange-600">{log.processed_by}</span>
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(log.processed_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}