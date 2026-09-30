import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Loader2, Package, Truck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import axios from 'axios';

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PREPARING: Package,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
};

interface TimelineEntry {
  status: string;
  note: string;
  updated_at: string;
}

interface TrackingData {
  order: {
    id: number;
    status: string;
    total_amount: string;
    created_at: string;
  };
  timeline: TimelineEntry[];
  currentStatus: string;
  allowedNextStatuses: string[];
}

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('1');
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function fetchTracking(id: string) {
    setLoading(true);
    try {
      const res = await axios.get(`/api/order-tracking/${id}`);
      setTracking(res.data.data);
    } catch {
      setTracking(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      await axios.patch(`/api/order-tracking/${orderId}/status`, {
        status: newStatus,
        note: `Manually updated to ${newStatus}`,
      });
      await fetchTracking(orderId);
    } catch { /* ignore */ }
    finally { setUpdating(false); }
  }

  useEffect(() => {
    fetchTracking(orderId);
  }, []);

  const currentStatusIndex = tracking
    ? STATUS_FLOW.indexOf(tracking.currentStatus)
    : -1;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">📦 Order Tracking</h1>
        <p className="mt-2 text-slate-500">
          Track order status through the delivery pipeline
        </p>
      </div>

      {/* Order ID Input */}
      <div className="mx-auto flex max-w-md gap-2">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID"
          className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm focus:border-orange-500 focus:outline-none"
        />
        <Button onClick={() => fetchTracking(orderId)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
        </Button>
      </div>

      {tracking && (
        <>
          {/* Status Timeline */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">
              Order #{tracking.order.id} — Rs. {Number(tracking.order.total_amount).toFixed(2)}
            </h3>

            <div className="relative">
              {STATUS_FLOW.map((status, index) => {
                const Icon = STATUS_ICONS[status] ?? Circle;
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={status} className="flex gap-3 pb-6 last:pb-0">
                    {/* Vertical Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-full ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 text-slate-400'
                        } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < STATUS_FLOW.length - 1 && (
                        <div
                          className={`mt-1 h-full w-0.5 flex-1 ${
                            index < currentStatusIndex ? 'bg-green-500' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>

                    {/* Status Info */}
                    <div className="pt-1">
                      <p className={`font-semibold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                        {status.replace(/_/g, ' ')}
                      </p>
                      {tracking.timeline
                        .filter(t => t.status === status)
                        .map((entry, idx) => (
                          <p key={idx} className="text-xs text-slate-500">
                            {entry.note} — {new Date(entry.updated_at).toLocaleTimeString()}
                          </p>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Status Update Buttons (Admin Simulation) */}
          {tracking.allowedNextStatuses.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-slate-900">
                Update Status (Admin Simulation)
              </h3>
              <div className="flex flex-wrap gap-2">
                {tracking.allowedNextStatuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(status)}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    → {status.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!tracking && !loading && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-900">Enter an Order ID</p>
          <p className="mt-1 text-slate-500">
            Place an order first, then enter its ID here to track it.
          </p>
        </div>
      )}
    </div>
  );
}