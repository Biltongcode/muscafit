'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import NavBar from './NavBar';

interface StravaSettingsProps {
  currentUserId: number;
  currentUserName: string;
}

export default function StravaSettings({ currentUserName }: StravaSettingsProps) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setMessage('Strava connected successfully!');
    } else if (searchParams.get('error')) {
      setMessage(`Connection failed: ${searchParams.get('error')}`);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/strava/status')
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setAthleteId(data.athleteId);
        setLastSync(data.lastSync);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Strava? This will remove cached activities.')) return;
    await fetch('/api/strava/disconnect', { method: 'POST' });
    setConnected(false);
    setAthleteId(null);
    setLastSync(null);
    setMessage('Strava disconnected.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <NavBar currentUserName={currentUserName} />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Strava</h1>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.includes('failed') || message.includes('error')
              ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
              : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 dark:text-slate-500">Loading...</div>
        ) : connected ? (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FC4C02' }}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Connected</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Athlete ID: {athleteId}</p>
              </div>
            </div>

            {lastSync && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Last synced: {new Date(lastSync + 'Z').toLocaleString('en-GB')}
              </p>
            )}

            <button
              onClick={handleDisconnect}
              className="px-4 py-2.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Disconnect Strava
            </button>
          </div>
        ) : (
          <div className="glass rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#FC4C02' }}>
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Connect your Strava account
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              See your runs, rides, and workouts right in Muscafit.
            </p>
            <a
              href="/api/strava/connect"
              className="inline-block px-6 py-3 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#FC4C02' }}
            >
              Connect with Strava
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
