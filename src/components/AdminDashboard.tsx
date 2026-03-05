'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from './NavBar';

interface AdminDashboardProps {
  currentUserName: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  weekCompletions: number;
  monthCompletions: number;
  recentActivity: Array<{
    id: number;
    user_name: string;
    exercise_name: string;
    log_date: string;
    actual_value: number | null;
    actual_sets: number | null;
    completed_at: string;
  }>;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function AdminDashboard({ currentUserName }: AdminDashboardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} isAdmin />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => router.push('/admin/users')}
            className="gradient-btn px-4 py-2 rounded-lg text-sm font-medium"
          >
            Manage Users
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <MetricCard
                label="Total Users"
                value={stats.totalUsers}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                color="from-blue-500 to-violet-500"
              />
              <MetricCard
                label="Active (7d)"
                value={stats.activeUsers}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                color="from-emerald-500 to-teal-500"
              />
              <MetricCard
                label="This Week"
                value={stats.weekCompletions}
                subtitle="completions"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
                color="from-amber-500 to-orange-500"
              />
              <MetricCard
                label="This Month"
                value={stats.monthCompletions}
                subtitle="completions"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                color="from-purple-500 to-pink-500"
              />
            </div>

            {/* Recent activity */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h2>
              {stats.recentActivity.length > 0 ? (
                <div className="glass rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-slate-700/50">
                  {stats.recentActivity.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{a.user_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-slate-100 truncate">
                            <span className="font-medium">{a.user_name}</span>
                            <span className="text-gray-400 dark:text-slate-500"> completed </span>
                            <span className="font-medium">{a.exercise_name}</span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            {a.log_date}
                            {a.actual_value ? ` \u00b7 ${a.actual_value} reps` : ''}
                            {a.actual_sets ? ` in ${a.actual_sets} sets` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 ml-2">
                        {a.completed_at ? timeAgo(a.completed_at) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl shadow-sm p-6 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Failed to load stats.</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, icon, color }: {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      {subtitle && <div className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</div>}
    </div>
  );
}
