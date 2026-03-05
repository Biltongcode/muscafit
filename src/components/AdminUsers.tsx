'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from './NavBar';

interface AdminUsersProps {
  currentUserName: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_active: string | null;
  total_completions: number;
  active_days: number;
  exercise_count: number;
  connection_count: number;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminUsers({ currentUserName }: AdminUsersProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetResult, setResetResult] = useState<{ userId: number; tempPassword: string } | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => { setUsers(data.users); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleResetPassword = async (userId: number, userName: string) => {
    if (!confirm(`Reset password for ${userName}? This will generate a new temporary password.`)) return;
    setResettingId(userId);
    setResetResult(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResetResult({ userId, tempPassword: data.tempPassword });
      }
    } catch {
      // ignore
    }
    setResettingId(null);
  };

  const copyPassword = async (password: string) => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} isAdmin />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Users</h1>
            <span className="text-sm text-gray-400 dark:text-slate-500">({users.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="glass rounded-xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span>
                      {user.role === 'admin' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400 uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{user.email}</p>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400 dark:text-slate-500">
                      <span>{user.exercise_count} exercise{user.exercise_count !== 1 ? 's' : ''}</span>
                      <span>{user.total_completions} completion{user.total_completions !== 1 ? 's' : ''}</span>
                      <span>{user.active_days} active day{user.active_days !== 1 ? 's' : ''}</span>
                      <span>{user.connection_count} connection{user.connection_count !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400 dark:text-slate-500">
                      <span>Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>Last active: {timeAgo(user.last_active)}</span>
                    </div>

                    {/* Password reset result */}
                    {resetResult?.userId === user.id && (
                      <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">New temporary password:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-green-200 dark:border-green-500/20 text-green-800 dark:text-green-300 select-all">
                            {resetResult.tempPassword}
                          </code>
                          <button
                            onClick={() => copyPassword(resetResult.tempPassword)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-[11px] text-green-600 dark:text-green-500 mt-1.5">Share this with the user. It won&apos;t be shown again.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleResetPassword(user.id, user.name)}
                    disabled={resettingId === user.id}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {resettingId === user.id ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
