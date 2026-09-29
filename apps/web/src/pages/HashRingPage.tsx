import { useEffect, useState } from 'react';
import { Loader2, Server } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

interface RingStats {
  physicalNodeCount: number;
  virtualNodeCount: number;
  virtualNodesPerNode: number;
  physicalNodes: string[];
}

interface LookupResult {
  key: string;
  assignedNode: string | null;
  hashPosition: number;
  hashPositionHex: string;
}

export default function HashRingPage() {
  const [stats, setStats] = useState<RingStats | null>(null);
  const [lookupKey, setLookupKey] = useState('restaurant:kfc_karachi');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');

  async function fetchStats() {
    try {
      const res = await axios.get('/api/hash-ring/stats');
      setStats(res.data.data);
    } catch { /* ignore */ }
  }

  async function handleLookup() {
    if (!lookupKey.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/hash-ring/lookup', {
        params: { key: lookupKey.trim() },
      });
      setLookupResult(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleAddNode() {
    if (!newNodeName.trim()) return;
    try {
      await axios.post('/api/hash-ring/add-node', { nodeName: newNodeName.trim() });
      setNewNodeName('');
      await fetchStats();
    } catch { /* ignore */ }
  }

  async function handleRemoveNode(nodeName: string) {
    try {
      await axios.post('/api/hash-ring/remove-node', { nodeName });
      await fetchStats();
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">🔄 Consistent Hashing Ring</h1>
        <p className="mt-2 text-slate-500">
          Week 5: Ring topologies, virtual nodes, and dynamic cluster rebalancing
        </p>
      </div>

      {/* Ring Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5 text-center">
            <Server className="mx-auto mb-2 h-6 w-6 text-orange-600" />
            <p className="text-2xl font-bold text-slate-900">{stats.physicalNodeCount}</p>
            <p className="text-sm text-slate-500">Physical Nodes</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.virtualNodeCount}</p>
            <p className="text-sm text-slate-500">Virtual Nodes (Ring Positions)</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.virtualNodesPerNode}</p>
            <p className="text-sm text-slate-500">Virtual Nodes Per Physical Node</p>
          </Card>
        </div>
      )}

      {/* Node Management */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Cluster Nodes</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {stats?.physicalNodes.map((node) => (
            <div key={node} className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700 ring-blue-200">
                <Server className="mr-1 h-3 w-3" /> {node}
              </Badge>
              <button
                onClick={() => handleRemoveNode(node)}
                className="text-xs text-red-500 hover:text-red-700"
                title={`Remove ${node}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            placeholder="New node name (e.g., cache-node-delta)"
          />
          <Button onClick={handleAddNode} disabled={!newNodeName.trim()}>
            Add Node
          </Button>
        </div>
      </Card>

      {/* Key Lookup */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Key Lookup</h3>
        <p className="mb-3 text-sm text-slate-500">
          Enter a cache key to see which node it maps to on the hash ring.
        </p>
        <div className="flex gap-2">
          <Input
            value={lookupKey}
            onChange={(e) => setLookupKey(e.target.value)}
            placeholder="e.g., restaurant:kfc_karachi"
          />
          <Button onClick={handleLookup} disabled={loading || !lookupKey.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
          </Button>
        </div>

        {lookupResult && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm">
              <span className="font-semibold">Key:</span> <code className="font-mono">{lookupResult.key}</code>
            </p>
            <p className="text-sm mt-1">
              <span className="font-semibold">Hash Position:</span>{' '}
              <code className="font-mono">{lookupResult.hashPositionHex}</code> ({lookupResult.hashPosition})
            </p>
            <p className="text-sm mt-1">
              <span className="font-semibold">Assigned Node:</span>{' '}
              <Badge className="bg-green-50 text-green-700 ring-green-200">
                {lookupResult.assignedNode ?? 'No nodes in ring'}
              </Badge>
            </p>
          </div>
        )}
      </Card>

      {/* Explanation */}
      <div className="rounded-2xl bg-slate-100 p-5">
        <h3 className="font-semibold text-slate-900">📖 How Consistent Hashing Works</h3>
        <ol className="mt-2 space-y-1 text-sm text-slate-600">
          <li>1. Each physical node gets <strong>150 virtual nodes</strong> spread across a 32-bit hash ring.</li>
          <li>2. When a key needs to be stored, it is <strong>MD5-hashed</strong> to a position on the ring.</li>
          <li>3. The key is assigned to the <strong>first node encountered clockwise</strong> from that position.</li>
          <li>4. When a node <strong>joins</strong>, only ~K/N keys move to it (not all keys).</li>
          <li>5. When a node <strong>leaves</strong>, its keys are redistributed only to the next clockwise node.</li>
          <li>6. Virtual nodes ensure <strong>even distribution</strong> and prevent hotspots.</li>
        </ol>
      </div>
    </div>
  );
}