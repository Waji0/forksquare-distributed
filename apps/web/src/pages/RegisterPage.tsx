import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Flame, Loader2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { checkUsername, registerUser } from '../lib/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Username availability check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [lookupMethod, setLookupMethod] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number>(0);

  // Debounced username check using Bloom Filter
  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const result = await checkUsername(username.trim());
        setUsernameStatus(result.data.exists ? 'taken' : 'available');
        setLookupMethod(result.data.lookupMethod);
        setResponseTime(result.data.responseTimeMs);
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [username]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await registerUser({ username, email, password });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <Card className="w-full p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Registration Successful!</h1>
          <p className="mt-2 text-slate-500">
            Your username was added to the Bloom Filter for future O(1) lookups.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-semibold text-white"
          >
            Go to Login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full p-6">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white">
            <Flame className="h-6 w-6" />
          </span>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Create Account
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Username availability is checked via Bloom Filter in O(1) time.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username with live availability check */}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>

            <div className="relative">
              <Input
                id="username"
                placeholder="Choose a username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                minLength={3}
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {usernameStatus === 'taken' && (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>

            {/* Bloom Filter lookup info */}
            {usernameStatus !== 'idle' && username.trim().length >= 3 && (
              <p className="mt-1 text-xs text-slate-500">
                {usernameStatus === 'available' && (
                  <span className="text-green-600">
                    ✓ Available — checked via {lookupMethod.replace(/_/g, ' ')} in {responseTime}ms
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-red-600">
                    ✗ Taken — verified via {lookupMethod.replace(/_/g, ' ')} in {responseTime}ms
                  </span>
                )}
                {usernameStatus === 'checking' && (
                  <span>Checking Bloom Filter...</span>
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>

            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>

            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || usernameStatus === 'taken'}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-500">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}