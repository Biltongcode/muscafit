'use client';

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

export default function StravaSection({
  activities,
  isConnected,
}: {
  activities: StravaActivity[];
  isConnected: boolean;
}) {
  if (!isConnected) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FC4C02">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#FC4C02' }}>
          Strava
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">No activities</p>
      ) : (
        <div className="space-y-1.5">
          {activities.map((a) => (
            <div key={a.stravaId} className="flex items-center gap-2 text-sm">
              <span className="text-sm flex-shrink-0">{sportIcon(a.sportType)}</span>
              <span className="text-gray-700 dark:text-slate-300 truncate font-medium">{a.name}</span>
              {a.distanceMeters > 0 && (
                <span className="text-gray-400 dark:text-slate-500 text-xs flex-shrink-0">
                  {formatDistance(a.distanceMeters)}
                </span>
              )}
              {a.movingTimeSeconds > 0 && (
                <span className="text-gray-400 dark:text-slate-500 text-xs flex-shrink-0">
                  {formatDuration(a.movingTimeSeconds)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
