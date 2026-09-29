import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import axios from 'axios';

interface ConflictResult {
  scenario: string;
  baseClock: { clock: Record<string, number>; formatted: string };
  nodeA_update: { action: string; clock: Record<string, number>; formatted: string };
  nodeB_update: { action: string; clock: Record<string, number>; formatted: string };
  comparison: string;
  isConflict: boolean;
  explanation: string;
  resolutionApplied: string;
}

export default function VectorClockPage() {
  const [result, setResult] = useState<ConflictResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSimulate() {
    setLoading(true);
    try {
      const res = await axios.post('/api/vector-clock/simulate-conflict');
      setResult(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">🕐 Vector Clocks & Conflict Detection</h1>
        <p className="mt-2 text-slate-500">
          Week 7: Logical clocks, Lamport timestamps, and causal ordering
        </p>
      </div>

      {/* Simulate Button */}
      <div className="text-center">
        <Button onClick={handleSimulate} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Simulate Concurrent Menu Updates
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Scenario */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900">Scenario</h3>
            <p className="mt-1 text-slate-600">{result.scenario}</p>
          </Card>

          {/* Clock Comparison */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase">Base Clock</p>
              <p className="mt-1 font-mono text-sm text-slate-700">{result.baseClock.formatted}</p>
            </Card>

            <Card className="p-4 border-orange-200">
              <p className="text-xs font-semibold text-orange-600 uppercase">Node A Update</p>
              <p className="mt-1 text-sm text-slate-700">{result.nodeA_update.action}</p>
              <p className="mt-1 font-mono text-sm text-slate-700">{result.nodeA_update.formatted}</p>
            </Card>

            <Card className="p-4 border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase">Node B Update</p>
              <p className="mt-1 text-sm text-slate-700">{result.nodeB_update.action}</p>
              <p className="mt-1 font-mono text-sm text-slate-700">{result.nodeB_update.formatted}</p>
            </Card>
          </div>

          {/* Conflict Result */}
          <Card className={`p-5 ${result.isConflict ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-start gap-3">
              {result.isConflict ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              )}
              <div>
                <p className={`font-semibold ${result.isConflict ? 'text-red-800' : 'text-green-800'}`}>
                  Comparison Result: {result.comparison.toUpperCase()}
                </p>
                <p className={`mt-1 text-sm ${result.isConflict ? 'text-red-700' : 'text-green-700'}`}>
                  {result.explanation}
                </p>
                {result.isConflict && (
                  <p className="mt-2 text-sm text-red-600">
                    <strong>Resolution Applied:</strong> {result.resolutionApplied}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Explanation */}
          <div className="rounded-2xl bg-slate-100 p-5">
            <h3 className="font-semibold text-slate-900">📖 How Vector Clocks Detect Conflicts</h3>
            <ol className="mt-2 space-y-1 text-sm text-slate-600">
              <li>1. Each distributed node maintains its own <strong>logical counter</strong>.</li>
              <li>2. When Node A updates data, it increments <strong>only its own counter</strong>.</li>
              <li>3. To compare two events, we compare their vector clocks <strong>element by element</strong>.</li>
              <li>4. If Clock A ≤ Clock B (all elements), A happened <strong>before</strong> B (causal order).</li>
              <li>5. If neither clock dominates, the events are <strong>CONCURRENT</strong> — a genuine conflict.</li>
              <li>6. Conflicts are resolved via <strong>Last-Writer-Wins (LWW)</strong>, <strong>CRDTs</strong>, or <strong>manual merge</strong>.</li>
              <li>7. This is how <strong>Amazon Dynamo</strong> and <strong>Riak</strong> handle concurrent writes.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-900">Ready to Simulate</p>
          <p className="mt-1 text-slate-500">
            Click the button above to simulate two concurrent menu updates
            and see how vector clocks detect the conflict.
          </p>
        </div>
      )}
    </div>
  );
}