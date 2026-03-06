'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from './NavBar';
import Avatar from './Avatar';

interface DayStats {
  completed: number;
  total: number;
  activities: string[];
  isRestDay?: boolean;
}

interface UserWeek {
  id: number;
  name: string;
  avatarUrl?: string | null;
  days: Record<string, DayStats>;
}

interface WeeklyViewProps {
  currentUserId: number;
  currentUserName: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // getDay() returns 0=Sun, 1=Mon, etc. We want Monday as start.
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(monday: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(toDateStr(d));
  }
  return dates;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const monStr = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const sunStr = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${monStr} – ${sunStr}`;
}

// Small activity dot icons
function ActivityDots({ activities }: { activities: string[] }) {
  if (activities.length === 0) return null;

  const colorMap: Record<string, string> = {
    squash: 'bg-orange-400',
    run: 'bg-blue-400',
    walk: 'bg-green-400',
    gym: 'bg-purple-400',
    cycle: 'bg-pink-400',
  };

  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {activities.map((act, i) => (
        <span
          key={`${act}-${i}`}
          className={`w-1.5 h-1.5 rounded-full ${colorMap[act] || 'bg-gray-400'}`}
          title={act}
        />
      ))}
    </div>
  );
}

export default function WeeklyView({ currentUserId, currentUserName }: WeeklyViewProps) {
  const router = useRouter();
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [users, setUsers] = useState<UserWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const weekDates = getWeekDates(monday);
  const todayStr = toDateStr(new Date());

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const start = weekDates[0];
      const end = weekDates[6];
      const res = await fetch(`/api/weekly?start=${start}&end=${end}`);
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch weekly data:', err);
    }
    setLoading(false);
  }, [weekDates[0], weekDates[6]]);

  const fetchInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const start = weekDates[0];
      const end = weekDates[6];
      const res = await fetch(`/api/weekly/insight?start=${start}&end=${end}`);
      const data = await res.json();
      setInsight(data.insight || null);
    } catch {
      setInsight(null);
    }
    setInsightLoading(false);
  }, [weekDates[0], weekDates[6]]);

  useEffect(() => {
    fetchWeek();
    fetchInsight();
  }, [fetchWeek, fetchInsight]);

  const changeWeek = (delta: number) => {
    const newMonday = new Date(monday);
    newMonday.setDate(newMonday.getDate() + delta * 7);
    setMonday(newMonday);
  };

  const goToDay = (dateStr: string) => {
    // Navigate to daily view — pass date as query param
    router.push(`/?date=${dateStr}`);
  };

  const isCurrentWeek =
    toDateStr(getMonday(new Date())) === toDateStr(monday);

  // Sort: current user first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} active="weekly" />

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => changeWeek(-1)}
            className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors touch-target flex items-center justify-center"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{formatWeekRange(monday)}</h2>
            {isCurrentWeek && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">This week</span>
            )}
          </div>
          <button
            onClick={() => changeWeek(1)}
            className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors touch-target flex items-center justify-center"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setMonday(getMonday(new Date()))}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              This week
            </button>
          )}
        </div>

        {/* AI Coach Insight */}
        {insightLoading ? (
          <div className="glass rounded-xl p-4 mb-4 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-purple-200 dark:bg-purple-800/40" />
              <div className="w-20 h-4 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="w-3/4 h-3 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          </div>
        ) : insight ? (
          <div className="glass rounded-xl p-4 mb-4 border-l-4 border-purple-400 dark:border-purple-500 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
              </svg>
              <div>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">AI Coach</span>
                <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 leading-relaxed">{insight}</p>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            {sortedUsers.map((user) => {
              const isOwn = user.id === currentUserId;
              return (
                <div key={user.id} className="glass rounded-xl shadow-sm dark:shadow-glow/5 overflow-hidden animate-fade-in">
                  {/* User header */}
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/80 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-slate-100">
                        {user.name}
                        {isOwn && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">(you)</span>}
                      </h3>
                    </div>
                  </div>

                  {/* Week grid — scrollable on mobile */}
                  <div className="relative">
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="grid grid-cols-7 min-w-[500px]">
                        {/* Day headers */}
                        {weekDates.map((dateStr, i) => {
                          const d = new Date(dateStr + 'T12:00:00');
                          const dayNum = d.getDate();
                          const isToday = dateStr === todayStr;

                          return (
                            <div
                              key={dateStr}
                              className={`text-center py-2 border-b border-gray-100 dark:border-slate-700/50 ${
                                isToday
                                  ? 'bg-blue-50 dark:bg-blue-500/10 font-semibold text-blue-700 dark:text-blue-400'
                                  : 'text-gray-500 dark:text-slate-400'
                              }`}
                            >
                              <div className="text-sm">{DAY_LABELS[i]}</div>
                              <div className="text-xs">{dayNum}</div>
                            </div>
                          );
                        })}

                        {/* Data cells */}
                        {weekDates.map((dateStr) => {
                          const stats = user.days[dateStr];
                          const isToday = dateStr === todayStr;
                          const isRestDay = stats?.isRestDay;
                          const hasData = stats && stats.total > 0;
                          const allDone = hasData && stats.completed === stats.total;
                          const partial = hasData && stats.completed > 0 && !allDone;

                          return (
                            <button
                              key={`cell-${dateStr}`}
                              onClick={() => goToDay(dateStr)}
                              className={`py-4 px-1 border-r border-gray-100 dark:border-slate-700/50 last:border-r-0 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30 ${
                                isToday ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
                              }`}
                            >
                              {isRestDay ? (
                                <div className="text-center">
                                  <span className="text-xs text-gray-300 dark:text-slate-600 italic">Rest</span>
                                  <ActivityDots activities={stats.activities} />
                                </div>
                              ) : hasData ? (
                                <div className="text-center">
                                  <span
                                    className={`inline-block text-sm font-semibold px-1.5 py-0.5 rounded ${
                                      allDone
                                        ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-500/15'
                                        : partial
                                        ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15'
                                        : 'text-gray-500 bg-gray-100 dark:text-slate-400 dark:bg-slate-700/50'
                                    }`}
                                  >
                                    {stats.completed}/{stats.total}
                                  </span>
                                  <ActivityDots activities={stats.activities} />
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="text-xs text-gray-300 dark:text-slate-600">–</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Scroll fade indicator for mobile */}
                    <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-slate-800/60 to-transparent pointer-events-none sm:hidden" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
