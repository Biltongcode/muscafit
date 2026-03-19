'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from './NavBar';

interface StatsViewProps {
  currentUserId: number;
  currentUserName: string;
}

interface ExerciseStat {
  exerciseName: string;
  targetType: string;
  weightUnit: string | null;
  users: Array<{ userId: number; userName: string; totalValue: number; daysCompleted: number; totalVolume: number }>;
  combinedTotal: number;
  combinedVolume: number;
}

interface ActivityStat {
  userId: number;
  userName: string;
  activityType: string;
  count: number;
  totalMinutes: number;
}

interface Goal {
  id: number;
  exerciseName: string;
  goalType: string;
  scope: string;
  userId: number | null;
  userName: string | null;
  targetValue: number;
  currentValue: number;
  percentComplete: number;
  year: number;
  month: number | null;
}

const PERIODS = [
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const USER_COLORS = [
  { bar: 'from-blue-500 to-violet-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' },
  { bar: 'from-emerald-500 to-teal-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' },
];

function formatValue(value: number, targetType: string): string {
  if (targetType.startsWith('timed')) {
    const hours = Math.floor(value / 3600);
    const mins = Math.floor((value % 3600) / 60);
    if (hours > 0) return `${hours.toLocaleString()}h ${mins}m`;
    return `${mins}m`;
  }
  return value.toLocaleString();
}

function formatUnit(targetType: string): string {
  return targetType.startsWith('timed') ? '' : ' reps';
}

function formatGoalDescription(goal: Goal): string {
  const target = goal.targetValue.toLocaleString();
  const unit = 'reps';
  if (goal.goalType === 'monthly' && goal.month) {
    return `${target} ${unit} in ${MONTH_NAMES[goal.month - 1]} ${goal.year}`;
  }
  return `${target} ${unit} in ${goal.year}`;
}

function getPaceStatus(goal: Goal): { label: string; color: string } {
  const now = new Date();
  let elapsed: number;
  let totalDays: number;

  if (goal.goalType === 'monthly' && goal.month) {
    const daysInMonth = new Date(goal.year, goal.month, 0).getDate();
    const startOfMonth = new Date(goal.year, goal.month - 1, 1);
    elapsed = Math.max(0, (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    totalDays = daysInMonth;
  } else {
    const startOfYear = new Date(goal.year, 0, 1);
    elapsed = Math.max(0, (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    totalDays = 365;
  }

  if (elapsed <= 0 || totalDays <= 0) return { label: 'Not started', color: 'text-gray-400 dark:text-slate-500' };

  const expectedPercent = Math.min(100, (elapsed / totalDays) * 100);
  const actualPercent = goal.percentComplete;

  if (actualPercent >= 100) return { label: 'Complete!', color: 'text-green-600 dark:text-green-400' };
  if (actualPercent >= expectedPercent * 0.9) return { label: 'On track', color: 'text-green-600 dark:text-green-400' };
  if (actualPercent >= expectedPercent * 0.6) return { label: 'Slightly behind', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Behind pace', color: 'text-red-500 dark:text-red-400' };
}

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={strokeWidth}
          className="stroke-gray-200 dark:stroke-slate-700"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="stroke-blue-500 dark:stroke-blue-400 transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{percent}%</span>
      </div>
    </div>
  );
}

interface ChallengeStats {
  user_id: number;
  user_name: string;
  beers: number;
  poops: number;
}

export default function StatsView({ currentUserName }: StatsViewProps) {
  const router = useRouter();
  const [period, setPeriod] = useState('month');
  const [exercises, setExercises] = useState<ExerciseStat[]>([]);
  const [activities, setActivities] = useState<ActivityStat[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [challengeStats, setChallengeStats] = useState<ChallengeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    // Fetch challenge stats once (not period-dependent)
    fetch('/api/challenges/stats')
      .then(r => r.json())
      .then(d => setChallengeStats(d.stats || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, goalsRes] = await Promise.all([
          fetch(`/api/stats?period=${period}`),
          fetch('/api/goals'),
        ]);
        const statsData = await statsRes.json();
        const goalsData = await goalsRes.json();
        setExercises(statsData.exercises);
        setActivities(statsData.activities);
        setDateRange(statsData.dateRange);
        setGoals(goalsData.goals);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [period]);

  // Group activities by user
  const activityByUser = new Map<string, ActivityStat[]>();
  for (const a of activities) {
    if (!activityByUser.has(a.userName)) activityByUser.set(a.userName, []);
    activityByUser.get(a.userName)!.push(a);
  }

  // Filter goals relevant to current period
  const now = new Date();
  const activeGoals = goals.filter(g => {
    if (g.goalType === 'yearly') return g.year === now.getFullYear();
    if (g.goalType === 'monthly') return g.year === now.getFullYear() && g.month === now.getMonth() + 1;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} active="stats" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Period selector */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                period === p.key
                  ? 'gradient-btn shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Challenge Tokens */}
        {challengeStats.length > 0 && (
          <div className="glass gradient-border rounded-xl shadow-card p-4 mb-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <span>&#x2694;&#xFE0F;</span> Challenge Tokens
            </h3>
            <div className="flex flex-wrap gap-4">
              {challengeStats.map(s => (
                <div key={s.user_id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{s.user_name}</span>
                  {s.beers > 0 && <span className="text-sm" title={`${s.beers} challenge${s.beers > 1 ? 's' : ''} completed`}>&#x1F37A; {s.beers}</span>}
                  {s.poops > 0 && <span className="text-sm" title={`${s.poops} challenge${s.poops > 1 ? 's' : ''} failed`}>&#x1F4A9; {s.poops}</span>}
                  {s.beers === 0 && s.poops === 0 && <span className="text-xs text-gray-400 dark:text-slate-500">No tokens yet</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {dateRange && (
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center mb-6">
            {new Date(dateRange.start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' \u2013 '}
            {new Date(dateRange.end + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Exercise totals */}
            {exercises.length > 0 ? (
              exercises.map(ex => {
                const isWeighted = ex.targetType === 'weighted';
                const maxUserValue = Math.max(...ex.users.map(u => u.totalValue), 1);
                return (
                  <div key={ex.exerciseName} className="glass rounded-xl shadow-sm p-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{ex.exerciseName}</h3>
                      <div className="text-right">
                        <span className="text-2xl font-bold gradient-text">
                          {formatValue(ex.combinedTotal, ex.targetType)}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-slate-500">{formatUnit(ex.targetType)}</span>
                        {isWeighted && ex.combinedVolume > 0 && (
                          <div className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                            {ex.combinedVolume.toLocaleString()} {ex.weightUnit || 'kg'} volume
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ex.users.map((user, i) => {
                        const color = USER_COLORS[i % USER_COLORS.length];
                        const widthPercent = maxUserValue > 0 ? (user.totalValue / maxUserValue) * 100 : 0;
                        return (
                          <div key={user.userId}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${color.text}`}>{user.userName}</span>
                              <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">
                                {formatValue(user.totalValue, ex.targetType)}
                                {isWeighted && user.totalVolume > 0 && (
                                  <span className="text-violet-600 dark:text-violet-400 text-xs ml-1">
                                    ({user.totalVolume.toLocaleString()} {ex.weightUnit || 'kg'})
                                  </span>
                                )}
                                <span className="text-gray-400 dark:text-slate-500 text-xs ml-1">
                                  ({user.daysCompleted} day{user.daysCompleted !== 1 ? 's' : ''})
                                </span>
                              </span>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${color.bar} transition-all duration-700`}
                                style={{ width: `${widthPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                No exercise data for this period.
              </div>
            )}

            {/* Goals section */}
            {activeGoals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 mt-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Goals</h2>
                  <button
                    onClick={() => router.push('/settings/goals')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Manage Goals
                  </button>
                </div>
                <div className="space-y-3">
                  {activeGoals.map(goal => {
                    const pace = getPaceStatus(goal);
                    return (
                      <div key={goal.id} className="glass rounded-xl shadow-sm p-4 flex items-center gap-4">
                        <ProgressRing percent={goal.percentComplete} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-slate-100">{goal.exerciseName}</div>
                          <div className="text-sm text-gray-500 dark:text-slate-400">{formatGoalDescription(goal)}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                            </span>
                            <span className={`text-xs font-medium ${pace.color}`}>{pace.label}</span>
                          </div>
                          {goal.scope === 'group' && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                              Group goal
                            </span>
                          )}
                          {goal.scope === 'individual' && goal.userName && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                              {goal.userName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeGoals.length === 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Goals</h2>
                </div>
                <div className="glass rounded-xl shadow-sm p-6 text-center">
                  <p className="text-gray-400 dark:text-slate-500 text-sm mb-2">No goals set yet.</p>
                  <button
                    onClick={() => router.push('/settings/goals')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    Set your first goal
                  </button>
                </div>
              </div>
            )}

            {/* Activity summary */}
            {activityByUser.size > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3 mt-6">Activities</h2>
                <div className="glass rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-slate-700/50">
                  {Array.from(activityByUser.entries()).map(([userName, userActivities]) => (
                    <div key={userName} className="p-4">
                      <div className="font-medium text-gray-900 dark:text-slate-100 mb-2">{userName}</div>
                      <div className="flex flex-wrap gap-3">
                        {userActivities.map(a => (
                          <div key={a.activityType} className="flex items-center gap-2 text-sm">
                            <ActivityIcon type={a.activityType} />
                            <span className="text-gray-700 dark:text-slate-300 capitalize">{a.activityType}</span>
                            <span className="text-gray-400 dark:text-slate-500">
                              {a.count}x
                              {a.totalMinutes > 0 && ` \u00b7 ${a.totalMinutes}min`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    run: '\uD83C\uDFC3',
    walk: '\uD83D\uDEB6',
    cycle: '\uD83D\uDEB4',
    gym: '\uD83C\uDFCB\uFE0F',
    squash: '\uD83C\uDFBE',
  };
  return <span className="text-base">{icons[type] || '\uD83C\uDFC5'}</span>;
}
