'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviterName, setInviterName] = useState('');
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      return;
    }

    fetch(`/api/connections/invite/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setTokenValid(false);
        } else {
          setEmail(data.email);
          setInviterName(data.inviterName);
          setTokenValid(true);
        }
        setValidatingToken(false);
      })
      .catch(() => {
        setError('Failed to validate invite');
        setValidatingToken(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Success — redirect to login
      router.push('/login?registered=1');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4">
        <p className="text-slate-400">Validating invite...</p>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">Muscafit</h1>
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-glow-lg p-6">
            <p className="text-slate-300 mb-4">
              {error || 'You need an invite to register for Muscafit.'}
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Ask a friend who already uses Muscafit to send you an invite.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Muscafit</h1>
          <p className="mt-2 text-slate-400">
            {inviterName} invited you to join!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-glow-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your name"
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/50 text-slate-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/30 text-slate-400 rounded-xl shadow-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/50 text-slate-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Confirm your password"
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/50 text-slate-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 gradient-btn rounded-xl text-base disabled:opacity-60 transition-all shadow-glow"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <button type="button" onClick={() => router.push('/login')} className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-500">Loading...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
