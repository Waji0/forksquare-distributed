import { useEffect, useState } from 'react';
import { BarChart3, Database, Package, RefreshCw, Store, Users } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import axios from 'axios';

interface DashboardData {
  stats: {
    totalOrders: number;
    totalUsers: number;
    totalRestaurants: number;
  };
  recentOrders: Array<{
    id: number;
    user_id: number;
    status: string;
    total_amount: string;
    created_at: string;
  }>;
  ordersByStatus: Array<{ status: string; count: string }>;
}

interface InventoryItem {
  item_id: string;
  quantity: number;
  version: number;
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, invRes] = await Promise.all([
        axios.get('/api/admin/dashboard', { headers }),
        axios.get('/api/admin/inventory', { headers }),
      ]);

      setDashboard(dashRes.data.data);
      setInventory(invRes.data.data);
    } catch {
      setDashboard(null);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !dashboard) {
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
          <h1 className="text-2xl font-bold text-slate-900">🛠️ Admin Panel</h1>
          <p className="text-slate-500">System overview and management</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="text-2xl font-bold">{dashboard.stats.totalOrders}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold">{dashboard.stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Restaurants</p>
                <p className="text-2xl font-bold">{dashboard.stats.totalRestaurants}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Orders by Status */}
      {dashboard && dashboard.ordersByStatus.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold">Orders by Status</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {dashboard.ordersByStatus.map((item) => (
              <Badge key={item.status} className="bg-slate-50 text-slate-700 ring-slate-200">
                {item.status}: {item.count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Orders */}
      {dashboard && dashboard.recentOrders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-semibold">Recent Orders</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {dashboard.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-400">#{order.id}</span>
                  <Badge
                    className={
                      order.status === 'DELIVERED' ? 'bg-green-50 text-green-700 ring-green-200'
                      : order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-200'
                      : 'bg-blue-50 text-blue-700 ring-blue-200'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
                <span className="text-sm font-semibold">Rs. {Number(order.total_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Inventory */}
      {inventory.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-400" />
              <h3 className="font-semibold">Inventory (PostgreSQL)</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {inventory.map((item) => (
              <div key={item.item_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <span className="font-mono text-sm">{item.item_id}</span>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      item.quantity === 0 ? 'bg-red-50 text-red-700 ring-red-200'
                      : item.quantity < 10 ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
                      : 'bg-green-50 text-green-700 ring-green-200'
                    }
                  >
                    Qty: {item.quantity}
                  </Badge>
                  <span className="text-xs text-slate-400">v{item.version}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}