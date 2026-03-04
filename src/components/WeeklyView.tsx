'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import NavBar from './NavBar';

interface DayStats {
  completed: number;
  total: number;
  activities: string[];
}

interface UserWeek {
  id: number;
  name: string;
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

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

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
    <div className="min-h-screen bg-gray-50">
      <NavBar currentUserName={currentUserName} active="weekly" />

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-600"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{formatWeekRange(monday)}</h2>
            {isCurrentWeek && (
              <span className="text-xs font-medium text-blue-600">This week</span>
            )}
          </div>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-600"
            aria-label="Next week"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setMonday(getMonday(new Date()))}
              className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
            >
              This week
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {sortedUsers.map((user) => {
              const isOwn = user.id === currentUserId;
              return (
                <div key={user.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* User header */}
                  <div className="px-4 py-2.5 border-b bg-gray-50/80">
                    <h3 className="font-semibold text-sm text-gray-900">
                      {user.name}
                      {isOwn && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </h3>
                  </div>

                  {/* Week grid */}
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 min-w-[420px]">
                      {/* Day headers */}
                      {weekDates.map((dateStr, i) => {
                        const d = new Date(dateStr + 'T12:00:00');
                        const dayNum = d.getDate();
                        const isToday = dateStr === todayStr;

                        return (
                          <div
                            key={dateStr}
                            className={`text-center py-1.5 border-b text-xs ${
                              isToday ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-500'
                            }`}
                          >
                            <div>{DAY_LABELS[i]}</div>
                            <div className="text-[10px]">{dayNum}</div>
                          </div>
                        );
                      })}

                      {/* Data cells */}
                      {weekDates.map((dateStr) => {
                        const stats = user.days[dateStr];
                        const isToday = dateStr === todayStr;
                        const hasData = stats && stats.total > 0;
                        const allDone = hasData && stats.completed === stats.total;
                        const partial = hasData && stats.completed > 0 && !allDone;
                        const isFuture = dateStr > todayStr;

                        return (
                          <button
                            key={`cell-${dateStr}`}
                            onClick={() => goToDay(dateStr)}
                            className={`py-3 px-1 border-r last:border-r-0 transition-colors hover:bg-gray-50 ${
                              isToday ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            {hasData ? (
                              <div className="text-center">
                                <span
                                  className={`inline-block text-sm font-semibold px-1.5 py-0.5 rounded ${
                                    allDone
                                      ? 'text-green-700 bg-green-100'
                                      : partial
                                      ? 'text-amber-700 bg-amber-100'
                                      : 'text-gray-500 bg-gray-100'
                                  }`}
                                >
                                  {stats.completed}/{stats.total}
                                </span>
                                <ActivityDots activities={stats.activities} />
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-xs text-gray-300">
                                  {isFuture ? '–' : '–'}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
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
