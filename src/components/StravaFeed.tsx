'use client';

import { useState, useEffect } from 'react';
import NavBar from './NavBar';
import Avatar from './Avatar';

interface StravaActivity {
  stravaId: number;
  userId: number;
  name: string;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
  startDateLocal: string;
  activityDate: string;
}

interface UserInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
}

function formatDistance(meters: number): string {
  if (meters === 0) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sportIcon(sportType: string): string {
  const map: Record<string, string> = {
    Run: '🏃', Ride: '🚴', Walk: '🚶', Hike: '🥾',
    Swim: '🏊', WeightTraining: '🏋️', Workout: '💪',
    Yoga: '🧘', EBikeRide: '🚲', VirtualRide: '🚴',
    TrailRun: '🏃', MountainBikeRide: '🚵',
  };
  return map[sportType] || '🏃';
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function StravaFeed({
  currentUserName,
  users,
}: {
  currentUserName: string;
  users: UserInfo[];
}) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strava/feed?days=14')
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))
      .catch((err) => console.error('Failed to fetch Strava feed:', err))
      .finally(() => setLoading(false));
  }, []);

  // Group by date
  const grouped = activities.reduce<Record<string, StravaActivity[]>>((acc, a) => {
    if (!acc[a.activityDate]) acc[a.activityDate] = [];
    acc[a.activityDate].push(a);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const getUserInfo = (userId: number) => users.find((u) => u.id === userId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <NavBar currentUserName={currentUserName} active="strava" />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#FC4C02">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Strava Activities</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : dates.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-slate-400 mb-2">No Strava activities in the last 14 days.</p>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Connect your Strava account in Settings to see activities here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map((date) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  {formatDateHeading(date)}
                </h2>
                <div className="space-y-3">
                  {grouped[date].map((a) => {
                    const user = getUserInfo(a.userId);
                    return (
                      <div key={a.stravaId} className="glass rounded-xl p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <Avatar name={user?.name || '?'} avatarUrl={user?.avatarUrl} size="md" className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{user?.name}</span>
                              <span className="text-sm">{sportIcon(a.sportType)}</span>
                              <span className="text-xs text-gray-400 dark:text-slate-500">{a.sportType}</span>
                            </div>
                            <p className="text-gray-900 dark:text-white font-semibold truncate">{a.name}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-slate-400">
                              {a.distanceMeters > 0 && (
                                <span>{formatDistance(a.distanceMeters)}</span>
                              )}
                              {a.movingTimeSeconds > 0 && (
                                <span>{formatDuration(a.movingTimeSeconds)}</span>
                              )}
                              {a.totalElevationGain > 0 && (
                                <span>{Math.round(a.totalElevationGain)}m elev</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
