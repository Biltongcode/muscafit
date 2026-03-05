'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const justRegistered = searchParams.get('registered') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 320 80" className="h-16 sm:h-20 w-auto" aria-label="Muscafit">
              <defs>
                <linearGradient id="loginGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#6C8EFF'}}/>
                  <stop offset="100%" style={{stopColor:'#A855F7'}}/>
                </linearGradient>
                <filter id="loginGlow">
                  <feGaussianBlur stdDeviation="2" result="cb"/>
                  <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#loginGrad)" opacity="0.15"/>
              <rect x="4" y="4" width="72" height="72" rx="18" fill="none" stroke="url(#loginGrad)" strokeWidth="1.5" opacity="0.6"/>
              <rect x="14" y="30" width="7" height="20" rx="3" fill="url(#loginGrad)" filter="url(#loginGlow)"/>
              <rect x="21" y="36" width="10" height="8" rx="2" fill="url(#loginGrad)"/>
              <rect x="31" y="38" width="18" height="4" rx="2" fill="url(#loginGrad)"/>
              <rect x="49" y="36" width="10" height="8" rx="2" fill="url(#loginGrad)"/>
              <rect x="59" y="30" width="7" height="20" rx="3" fill="url(#loginGrad)" filter="url(#loginGlow)"/>
              <text x="92" y="51" fontFamily="'DM Serif Display', Georgia, serif" fontSize="34" fontWeight="700" letterSpacing="-0.5" fill="white">Muscafit</text>
              <line x1="92" y1="58" x2="308" y2="58" stroke="url(#loginGrad)" strokeWidth="1.5" opacity="0.35"/>
            </svg>
          </div>
          <p className="mt-2 text-slate-400">Log in to track your training</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-glow-lg p-6 space-y-4">
          {justRegistered && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3">
              Account created! Sign in to get started.
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/50 text-slate-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
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
              autoComplete="current-password"
              className="w-full px-3 py-3 border border-slate-600 bg-slate-700/50 text-slate-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 gradient-btn rounded-xl text-base disabled:opacity-60 transition-all shadow-glow"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Need an account? Ask a friend to invite you.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-500">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
