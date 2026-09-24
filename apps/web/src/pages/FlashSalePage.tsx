import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import axios from 'axios';

export default function FlashSalePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleBuy() {
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('/api/flash-sale/buy', {
        itemId: 'flash_burger_gold',
        userId: 1, // Simulated user
      });
      setResult({ success: true, message: response.data.message });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to purchase';
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">⚡ Flash Sale</h1>
        <p className="text-slate-500">
          Concurrency Control Demo: Only 1 Golden Burger exists in the database.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex h-48 items-center justify-center bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 text-8xl">
          🍔
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">The Golden Burger</h2>
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
              ONLY 1 LEFT!
            </span>
          </div>
          
          <p className="text-slate-600">
            This endpoint uses <strong>Redis Distributed Locks</strong> and <strong>PostgreSQL MVCC</strong> to ensure 
            that if 50 users click this button at the exact same millisecond, only 1 succeeds and 49 fail gracefully.
          </p>

          <Button 
            onClick={handleBuy} 
            disabled={loading} 
            className="w-full text-lg h-14"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Transaction...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                BUY NOW (Rs. 99)
              </>
            )}
          </Button>

          {result && (
            <div className={`rounded-xl p-4 text-sm font-medium ${
              result.success 
                ? 'bg-green-50 text-green-800 ring-1 ring-green-200' 
                : 'bg-red-50 text-red-800 ring-1 ring-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                )}
                <span>{result.message}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}