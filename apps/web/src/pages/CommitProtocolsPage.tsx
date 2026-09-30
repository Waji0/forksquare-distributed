import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

type Protocol = '2pc' | '3pc';
type Scenario = 'all_success' | 'one_participant_fails' | 'coordinator_fails';

interface PhaseResult {
  phase: string;
  action: string;
  participants: Array<{ id: string; state: string; vote: string | null }>;
}

interface ProtocolResult {
  protocol: string;
  outcome: string;
  phases: PhaseResult[];
  coordinatorFailed?: boolean;
  blockingDetected?: boolean;
  coordinatorFailedAt?: string | null;
  explanation: string;
}

export default function CommitProtocolsPage() {
  const [result, setResult] = useState<ProtocolResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runProtocol(protocol: Protocol, scenario: Scenario) {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`/api/commit-protocols/${protocol}`, {
        scenario,
        participantCount: '3',
      });
      setResult(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">🤝 2PC & 3PC Protocols</h1>
        <p className="mt-2 text-slate-500">
          Week 8-9: Atomic commit, blocking scenarios, non-blocking protocols
        </p>
      </div>

      {/* Controls */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Run Simulation</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 2PC */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-700">Two-Phase Commit (2PC)</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => runProtocol('2pc', 'all_success')}>
                ✅ All Success
              </Button>
              <Button size="sm" variant="outline" onClick={() => runProtocol('2pc', 'one_participant_fails')}>
                ❌ One Fails
              </Button>
              <Button size="sm" variant="outline" onClick={() => runProtocol('2pc', 'coordinator_fails')}>
                ⚠️ Coordinator Dies
              </Button>
            </div>
          </div>

          {/* 3PC */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-green-700">Three-Phase Commit (3PC)</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => runProtocol('3pc', 'all_success')}>
                ✅ All Success
              </Button>
              <Button size="sm" variant="outline" onClick={() => runProtocol('3pc', 'one_participant_fails')}>
                ❌ One Fails
              </Button>
              <Button size="sm" variant="outline" onClick={() => runProtocol('3pc', 'coordinator_fails')}>
                ⚠️ Coordinator Dies
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Outcome */}
          <Card className={`p-5 ${
            result.outcome === 'COMMITTED' || result.outcome === 'RECOVERED_AFTER_FAILURE'
              ? 'border-green-200 bg-green-50'
              : result.outcome === 'BLOCKED'
              ? 'border-red-200 bg-red-50'
              : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-center gap-3">
              {result.outcome === 'COMMITTED' || result.outcome === 'RECOVERED_AFTER_FAILURE' ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : result.outcome === 'BLOCKED' ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <XCircle className="h-6 w-6 text-yellow-600" />
              )}
              <div>
                <p className="font-bold text-slate-900">
                  {result.protocol} — Outcome: {result.outcome}
                </p>
                <p className="text-sm text-slate-600">{result.explanation}</p>
              </div>
            </div>
          </Card>

          {/* Phases */}
          {result.phases.map((phase, idx) => (
            <Card key={idx} className={`p-4 ${phase.phase.includes('FAILURE') ? 'border-red-300' : ''}`}>
              <p className={`font-semibold ${phase.phase.includes('FAILURE') ? 'text-red-700' : 'text-slate-900'}`}>
                {phase.phase}
              </p>
              <p className="mt-1 text-sm text-slate-500">{phase.action}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {phase.participants.map((p) => (
                  <Badge
                    key={p.id}
                    className={
                      p.state === 'COMMITTED' ? 'bg-green-50 text-green-700 ring-green-200'
                      : p.state === 'BLOCKED' ? 'bg-red-50 text-red-700 ring-red-200'
                      : p.state === 'ABORTED' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
                      : p.state === 'PRE_COMMITTED' ? 'bg-blue-50 text-blue-700 ring-blue-200'
                      : 'bg-slate-50 text-slate-600 ring-slate-200'
                    }
                  >
                    {p.id}: {p.state} {p.vote ? `(${p.vote})` : ''}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Play className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-900">Run a Simulation</p>
          <p className="mt-1 text-slate-500">
            Click a button above to see how 2PC and 3PC handle different failure scenarios.
          </p>
        </div>
      )}
    </div>
  );
}