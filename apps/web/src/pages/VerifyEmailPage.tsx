import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import axios from 'axios';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || code.length !== 6) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await axios.post('/api/auth/verify-email', {
        email: email.trim(),
        code,
      });

      setMessage({ type: 'success', text: res.data.message ?? 'Email verified!' });

      // Redirect to login after a short pause
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error ?? 'Verification failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim() || cooldown > 0) return;

    setResending(true);
    setMessage(null);

    try {
      const res = await axios.post('/api/auth/resend-verification', {
        email: email.trim(),
      });
      setMessage({ type: 'success', text: res.data.message ?? 'New code sent!' });
      setCooldown(30);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error ?? 'Failed to resend code.',
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-600 text-white">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Verify Your Email</h1>
        <p className="mt-2 text-slate-500">
          Enter the 6-digit code we sent to your email address.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Verification Code
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="······"
              inputMode="numeric"
              maxLength={6}
              className="text-center font-mono text-2xl tracking-[0.5em]"
              required
            />
          </div>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Verify Email
          </Button>
        </form>

        <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email.trim()}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {resending ? (
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 inline h-3 w-3" />
            )}
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get the code? Resend"}
          </button>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Codes expire after 10 minutes. Check your spam folder or Mailtrap inbox.
      </p>
    </div>
  );
}