import { FormEvent, useState } from 'react';
import { KeyRound, Loader2, MailCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { forgotPassword } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
    //   const response = await forgotPassword(email.trim());
    await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <Card className="w-full p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-100 text-green-600">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Check Your Email</h1>
          <p className="mt-2 text-slate-500">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            Please check your inbox (and spam folder).
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-orange-600 hover:text-orange-500">
            ← Back to Login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-600 text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password?</h1>
          <p className="mt-2 text-slate-500">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm font-semibold text-orange-600 hover:text-orange-500">
            ← Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
}