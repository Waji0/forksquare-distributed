import { useEffect, useState } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

interface GraphRelationship {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

const nodeColors: Record<string, string> = {
  Restaurant: 'bg-orange-100 text-orange-800 ring-orange-300',
  Cuisine: 'bg-blue-100 text-blue-800 ring-blue-300',
  Category: 'bg-green-100 text-green-800 ring-green-300',
};

export default function GraphPage() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchGraph() {
    setLoading(true);
    try {
      const res = await axios.get('/api/graph');
      setGraph(res.data.data);
    } catch {
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGraph();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  const restaurants = graph?.nodes.filter(n => n.label === 'Restaurant') ?? [];
  const cuisines = graph?.nodes.filter(n => n.label === 'Cuisine') ?? [];
  const categories = graph?.nodes.filter(n => n.label === 'Category') ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🔗 Graph Visualization</h1>
          <p className="text-slate-500">
            Powered by <strong>Neo4j</strong> — Restaurant → Cuisine → Category relationships
          </p>
        </div>
        <button onClick={fetchGraph} className="text-slate-600 hover:text-orange-600">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{restaurants.length}</p>
          <p className="text-sm text-slate-500">Restaurants</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{cuisines.length}</p>
          <p className="text-sm text-slate-500">Cuisines</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{categories.length}</p>
          <p className="text-sm text-slate-500">Categories</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{graph?.relationships.length ?? 0}</p>
          <p className="text-sm text-slate-500">Relationships</p>
        </Card>
      </div>

      {/* Graph Visualization */}
      {graph && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Relationship Graph</h3>
          </div>

          <div className="space-y-4">
            {restaurants.map((restaurant) => {
              const rels = graph.relationships.filter(r => r.source === restaurant.id);
              return (
                <div key={restaurant.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍽️</span>
                    <span className="font-semibold text-slate-900">
                      {restaurant.properties.name as string}
                    </span>
                    <Badge className="bg-yellow-50 text-yellow-700 ring-yellow-200">
                      ⭐ {restaurant.properties.rating as number}
                    </Badge>
                  </div>

                  {rels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-7">
                      {rels.map((rel, idx) => {
                        const targetNode = graph.nodes.find(n => n.id === rel.target);
                        return (
                          <span key={idx} className="flex items-center gap-1 text-sm">
                            <span className="text-slate-400">
                              --[{rel.type}]→
                            </span>
                            <Badge className={nodeColors[targetNode?.label ?? 'Category'] ?? nodeColors.Category}>
                              {targetNode?.properties.name as string}
                            </Badge>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="rounded-2xl bg-slate-100 p-5">
        <h3 className="font-semibold text-slate-900">Graph Legend</h3>
        <div className="mt-2 flex flex-wrap gap-3">
          <Badge className={nodeColors.Restaurant}>🍽️ Restaurant</Badge>
          <Badge className={nodeColors.Cuisine}>🍳 Cuisine</Badge>
          <Badge className={nodeColors.Category}>📂 Category</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Relationships: (Restaurant)-[:SERVES]→(Cuisine) and (Restaurant)-[:BELONGS_TO]→(Category).
          Query with: <code className="rounded bg-slate-200 px-1 font-mono text-xs">GET /api/graph/by-cuisine?cuisine=Italian</code>
        </p>
      </div>
    </div>
  );
}