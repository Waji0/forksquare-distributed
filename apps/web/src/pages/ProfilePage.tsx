import { FormEvent, useState, useEffect } from 'react';
import { User, Mail, Loader2, Save, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { updateProfile } from '../lib/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  
  // Get current user from localStorage
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateProfile({ username, email });
      
      // Update localStorage with new user data
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setSuccess(response.data.message);

      // If email changed and is unverified, redirect to verify
      if (!response.data.user.isVerified) {
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(response.data.user.email)}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!currentUser) return null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-600 text-white">
            <User className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Update your account information.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
            {currentUser.email !== email && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ Changing your email will require re-verification.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            ← Back to Home
          </button>
        </div>
      </Card>
    </div>
  );
}