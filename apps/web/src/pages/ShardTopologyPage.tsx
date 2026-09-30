import { useEffect, useState } from 'react';
import { Database, Hash, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

interface ShardTopology {
  orderShards: Array<{ shardId: string; schema: string; partitionType: string }>;
  restaurantShards: Array<{ shardId: string; collection: string; partitionType: string; regions: string[] }>;
  regionMap: Record<string, string>;
}

interface Distribution {
  totalUsers: number;
  distribution: Record<string, number>;
  balanceRatio: string;
  isBalanced: boolean;
}

export default function ShardTopologyPage() {
  const [topology, setTopology] = useState<ShardTopology | null>(null);
  const [distribution, setDistribution] = useState<Distribution | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [topoRes, distRes] = await Promise.all([
          axios.get('/api/shards/topology'),
          axios.get('/api/shards/distribution?totalUsers=1000'),
        ]);
        setTopology(topoRes.data.data);
        setDistribution(distRes.data.data);
      } catch { /* ignore */ }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">🗂️ Shard Topology</h1>
        <p className="mt-2 text-slate-500">
          Week 3: Horizontal fragmentation, hash partitioning, range partitioning
        </p>
      </div>

      {/* Hash Partitioning (Orders) */}
      {topology && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Hash Partitioning — Orders</h3>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Formula: <code className="rounded bg-slate-100 px-1 font-mono text-xs">MD5(user_id) % 3</code>
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {topology.orderShards.map((shard) => (
              <div key={shard.shardId} className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="font-mono text-sm font-bold text-blue-800">{shard.shardId}</p>
                <p className="text-xs text-blue-600">Schema: {shard.schema}</p>
                <p className="text-xs text-blue-600">{shard.partitionType}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Range Partitioning (Restaurants) */}
      {topology && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-slate-900">Range Partitioning — Restaurants</h3>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Partitioned by geographic region (city → shard)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {topology.restaurantShards.map((shard) => (
              <div key={shard.shardId} className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="font-mono text-sm font-bold text-green-800">{shard.shardId}</p>
                <p className="text-xs text-green-600">Collection: {shard.collection}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {shard.regions.map((region) => (
                    <Badge key={region} className="bg-green-100 text-green-700 ring-green-200">
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Distribution */}
      {distribution && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-slate-900">Key Distribution ({distribution.totalUsers} users)</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(distribution.distribution).map(([shard, count]) => (
              <div key={shard} className="flex items-center gap-3">
                <span className="w-32 font-mono text-sm text-slate-600">{shard}</span>
                <div className="flex-1">
                  <div className="h-4 w-full rounded-full bg-slate-100">
                    <div
                      className="h-4 rounded-full bg-purple-500"
                      style={{ width: `${(count / distribution.totalUsers) * 100 * 3}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Balance Ratio: <strong>{distribution.balanceRatio}</strong>{' '}
            {distribution.isBalanced ? '✅ Well balanced' : '⚠️ Imbalanced'}
          </p>
        </Card>
      )}
    </div>
  );
}