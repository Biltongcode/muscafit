'use client';

import { useState, useEffect } from 'react';
import NavBar from './NavBar';

interface ProfileSettingsProps {
  currentUserId: number;
  currentUserName: string;
}

export default function ProfileSettings({ currentUserName }: ProfileSettingsProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/settings/profile');
        const data = await res.json();
        setName(data.user.name);
        setEmail(data.user.email);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated. Changes will appear on your next sign-in.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save changes' });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Profile</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <form onSubmit={handleSave} className="glass rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {message && (
              <div
                className={`text-sm px-3 py-2.5 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !name.trim() || !email.trim()}
              className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
