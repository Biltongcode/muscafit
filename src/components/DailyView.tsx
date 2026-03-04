'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import NavBar from './NavBar';
import Avatar from './Avatar';
import StravaSection from './StravaSection';

// --- Types ---

interface Exercise {
  logId: number;
  exerciseId: number;
  name: string;
  targetType: string;
  targetValue: number | null;
  targetSets: number | null;
  targetPerSet: number | null;
  exerciseNotes: string | null;
  completed: boolean;
  actualValue: number | null;
  actualSets: number | null;
  logNotes: string | null;
  completedAt: string | null;
}

interface UserData {
  id: number;
  name: string;
  avatarUrl?: string | null;
  exercises: Exercise[];
  isRestDay?: boolean;
}

interface Activity {
  id: number;
  userId: number;
  activityType: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  notes: string | null;
  sessionDate: string;
}

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

interface Comment {
  id: number;
  authorId: number;
  targetUserId: number;
  commentDate: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl?: string | null;
}

interface DailyViewProps {
  currentUserId: number;
  currentUserName: string;
  currentUserAvatar?: string | null;
}

// --- Helpers ---

const ACTIVITY_TYPES = [
  { key: 'squash', label: 'Squash' },
  { key: 'run', label: 'Run' },
  { key: 'walk', label: 'Walk' },
  { key: 'gym', label: 'Gym' },
  { key: 'cycle', label: 'Cycle' },
] as const;

function formatTarget(ex: Exercise): string {
  switch (ex.targetType) {
    case 'reps':
      return `${ex.targetValue}`;
    case 'reps_sets':
      return `${ex.targetValue} in ${ex.targetSets}\u00d7${ex.targetPerSet}`;
    case 'timed':
      return `${ex.targetValue} sec`;
    case 'timed_sets': {
      const desc = `${ex.targetSets}\u00d7${ex.targetPerSet} sec`;
      return ex.exerciseNotes ? `${desc} (${ex.exerciseNotes})` : desc;
    }
    default:
      return '';
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Activity Icons (inline SVG) ---

function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const cls = className || 'w-5 h-5';
  switch (type) {
    case 'squash':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="16" cy="6" r="3" />
          <path strokeLinecap="round" d="M5 19c1-3 3-5 6-6M11 13l5-5M3 21l3-3" />
        </svg>
      );
    case 'run':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="13" cy="4" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21l3-7 3 2 4-6M16 11l2-3M10 14l-3 1" />
        </svg>
      );
    case 'walk':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="4" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21l2-7M15 21l-2-7M13 14l1-4-3-1-1 4" />
        </svg>
      );
    case 'gym':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M4 12h16M6 8v8M18 8v8M3 10v4M21 10v4M9 10v4M15 10v4" />
        </svg>
      );
    case 'cycle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="6" cy="16" r="4" />
          <circle cx="18" cy="16" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 16l5-8h4l3 8M11 8l2 8" />
        </svg>
      );
    default:
      return null;
  }
}

// --- Main Component ---

export default function DailyView({ currentUserId, currentUserName, currentUserAvatar }: DailyViewProps) {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') || getTodayStr();
  const [date, setDate] = useState(initialDate);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [stravaConnectedUserIds, setStravaConnectedUserIds] = useState<number[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [activityModal, setActivityModal] = useState<{
    userId: number;
    type: string;
    existing: Activity | null;
  } | null>(null);

  const isToday = date === getTodayStr();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, activitiesRes, commentsRes, stravaRes] = await Promise.all([
        fetch(`/api/logs?date=${date}`),
        fetch(`/api/activities?date=${date}`),
        fetch(`/api/comments?date=${date}`),
        fetch(`/api/strava/activities?date=${date}`),
      ]);
      const logsData = await logsRes.json();
      const activitiesData = await activitiesRes.json();
      const commentsData = await commentsRes.json();
      const stravaData = await stravaRes.json();
      setUsers(logsData.users);
      setActivities(activitiesData.activities);
      setComments(commentsData.comments);
      setStravaActivities(stravaData.activities || []);
      setStravaConnectedUserIds(stravaData.connectedUserIds || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
    setExpandedLog(null);
    setActivityModal(null);
  };

  const toggleExercise = async (userId: number, logId: number, exerciseId: number, currentCompleted: boolean) => {
    if (userId !== currentUserId) return;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          exercises: u.exercises.map((e) => {
            if (e.logId !== logId) return e;
            return {
              ...e,
              completed: !currentCompleted,
              completedAt: !currentCompleted ? new Date().toISOString() : null,
            };
          }),
        };
      })
    );

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, date, completed: !currentCompleted }),
      });
    } catch {
      fetchData();
    }
  };

  const saveDetails = async (logId: number, actualValue: number | null, actualSets: number | null, notes: string | null) => {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualValue, actualSets, notes }),
      });

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          exercises: u.exercises.map((e) => {
            if (e.logId !== logId) return e;
            return { ...e, actualValue, actualSets, logNotes: notes };
          }),
        }))
      );
    } catch (err) {
      console.error('Failed to save details:', err);
    }
    setExpandedLog(null);
  };

  // --- Activity handlers ---

  const handleActivityClick = (userId: number, type: string) => {
    const existing = activities.find((a) => a.userId === userId && a.activityType === type);
    if (userId === currentUserId) {
      setActivityModal({ userId, type, existing: existing ?? null });
    }
  };

  const saveActivity = async (durationMinutes: number | null, notes: string | null) => {
    if (!activityModal) return;
    const { type, existing } = activityModal;

    try {
      if (existing) {
        await fetch(`/api/activities/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationMinutes, notes }),
        });
      } else {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, activityType: type, durationMinutes, notes }),
        });
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to save activity:', err);
    }
    setActivityModal(null);
  };

  const deleteActivity = async () => {
    if (!activityModal?.existing) return;
    try {
      await fetch(`/api/activities/${activityModal.existing.id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete activity:', err);
    }
    setActivityModal(null);
  };

  // --- Comment handler ---

  const postComment = async (targetUserId: number, body: string) => {
    // Optimistic update
    const tempComment: Comment = {
      id: Date.now(),
      authorId: currentUserId,
      targetUserId,
      commentDate: date,
      body,
      createdAt: new Date().toISOString(),
      authorName: currentUserName,
      authorAvatarUrl: currentUserAvatar,
    };
    setComments((prev) => [...prev, tempComment]);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, date, comment: body }),
      });
      const data = await res.json();
      // Replace temp comment with real one
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? data.comment : c))
      );
    } catch {
      // Remove temp comment on error
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
    }
  };

  // Sort: current user first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} active="daily" />

      {/* Date Navigation */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => changeDate(-1)}
            className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors touch-target flex items-center justify-center"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{formatDate(date)}</h2>
            {isToday && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Today</span>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors touch-target flex items-center justify-center"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!isToday && (
            <button
              onClick={() => { setDate(getTodayStr()); setExpandedLog(null); setActivityModal(null); }}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {sortedUsers.map((user) => {
              const completed = user.exercises.filter((e) => e.completed).length;
              const total = user.exercises.length;
              const isOwn = user.id === currentUserId;
              const userActivities = activities.filter((a) => a.userId === user.id);
              const userStravaActivities = stravaActivities.filter((a) => a.userId === user.id);
              const userHasStrava = stravaConnectedUserIds.includes(user.id);
              const userComments = comments.filter((c) => c.targetUserId === user.id);

              return (
                <div key={user.id} className="glass rounded-xl shadow-sm dark:shadow-glow/5 animate-fade-in">
                  {/* User header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                        {user.name}
                        {isOwn && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">(you)</span>}
                      </h3>
                    </div>
                    {total > 0 && (
                      <span
                        className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                          completed === total
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                            : completed > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700/50 dark:text-slate-400'
                        }`}
                      >
                        {completed}/{total}
                      </span>
                    )}
                  </div>

                  {/* Exercise list */}
                  <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {user.exercises.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
                        {user.isRestDay ? 'Rest day' : 'No exercises configured'}
                      </div>
                    ) : (
                      user.exercises.map((ex) => (
                        <ExerciseRow
                          key={ex.logId}
                          exercise={ex}
                          isOwn={isOwn}
                          isExpanded={expandedLog === ex.logId}
                          onToggle={() => toggleExercise(user.id, ex.logId, ex.exerciseId, ex.completed)}
                          onExpand={() => setExpandedLog(expandedLog === ex.logId ? null : ex.logId)}
                          onSave={(val, sets, notes) => saveDetails(ex.logId, val, sets, notes)}
                        />
                      ))
                    )}
                  </div>

                  {/* Activity Bar — always show for own column, only show for others if they have activities */}
                  {(isOwn || userActivities.length > 0) && (
                    <ActivityBar
                      userId={user.id}
                      isOwn={isOwn}
                      userActivities={userActivities}
                      onActivityClick={(type) => handleActivityClick(user.id, type)}
                    />
                  )}

                  {/* Strava Activities */}
                  <StravaSection
                    activities={userStravaActivities}
                    isConnected={userHasStrava}
                  />

                  {/* Comments */}
                  <CommentSection
                    comments={userComments}
                    onPost={(body) => postComment(user.id, body)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Modal */}
      {activityModal && (
        <ActivityModal
          type={activityModal.type}
          existing={activityModal.existing}
          onSave={saveActivity}
          onDelete={activityModal.existing ? deleteActivity : undefined}
          onClose={() => setActivityModal(null)}
        />
      )}
    </div>
  );
}

// --- Activity Bar ---

function ActivityBar({
  userId,
  isOwn,
  userActivities,
  onActivityClick,
}: {
  userId: number;
  isOwn: boolean;
  userActivities: Activity[];
  onActivityClick: (type: string) => void;
}) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/30">
      <div className="flex items-center justify-around">
        {ACTIVITY_TYPES.map(({ key, label }) => {
          const activity = userActivities.find((a) => a.activityType === key);
          const isLogged = !!activity;

          return (
            <button
              key={key}
              onClick={() => onActivityClick(key)}
              disabled={!isOwn}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isOwn ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50' : 'cursor-default'
              } ${isLogged ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`}
              title={label}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  isLogged ? 'bg-blue-100 dark:bg-blue-500/15' : ''
                }`}
              >
                <ActivityIcon type={key} className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium leading-none">
                {isLogged && activity.durationMinutes
                  ? `${activity.durationMinutes}m`
                  : label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Activity Modal ---

function ActivityModal({
  type,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  type: string;
  existing: Activity | null;
  onSave: (durationMinutes: number | null, notes: string | null) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState(existing?.durationMinutes?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const label = ACTIVITY_TYPES.find((a) => a.key === type)?.label ?? type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative glass rounded-xl shadow-xl dark:shadow-glow w-full max-w-sm p-5 animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-500/15 rounded-full text-blue-600 dark:text-blue-400">
            <ActivityIcon type={type} className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
            {existing ? `Edit ${label}` : `Log ${label}`}
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 45"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. easy pace"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(duration ? Number(duration) : null, notes || null)}
            className="flex-1 py-2.5 gradient-btn rounded-lg text-sm"
          >
            {existing ? 'Update' : 'Save'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2.5 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2.5 text-gray-600 dark:text-slate-400 text-sm rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Exercise Row ---

interface ExerciseRowProps {
  exercise: Exercise;
  isOwn: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onSave: (actualValue: number | null, actualSets: number | null, notes: string | null) => void;
}

function ExerciseRow({ exercise, isOwn, isExpanded, onToggle, onExpand, onSave }: ExerciseRowProps) {
  const [editValue, setEditValue] = useState<string>(exercise.actualValue?.toString() ?? '');
  const [editSets, setEditSets] = useState<string>(exercise.actualSets?.toString() ?? '');
  const [editNotes, setEditNotes] = useState<string>(exercise.logNotes ?? '');
  const [justChecked, setJustChecked] = useState(false);

  useEffect(() => {
    setEditValue(exercise.actualValue?.toString() ?? '');
    setEditSets(exercise.actualSets?.toString() ?? '');
    setEditNotes(exercise.logNotes ?? '');
  }, [exercise.actualValue, exercise.actualSets, exercise.logNotes]);

  const hasSets = exercise.targetType === 'reps_sets' || exercise.targetType === 'timed_sets';

  const handleToggle = () => {
    if (!exercise.completed) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 300);
    }
    onToggle();
  };

  return (
    <div className={`transition-colors ${exercise.completed ? 'bg-green-50/80 dark:bg-green-500/5' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={isOwn ? handleToggle : undefined}
          disabled={!isOwn}
          className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
            exercise.completed
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 dark:border-green-400 text-white'
              : isOwn
              ? 'border-gray-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-green-500'
              : 'border-gray-200 dark:border-slate-700'
          } ${isOwn ? 'cursor-pointer' : 'cursor-default'} ${justChecked ? 'animate-check-pop' : ''}`}
          aria-label={exercise.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {exercise.completed && (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${exercise.completed ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-slate-100'}`}>
            {exercise.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {formatTarget(exercise)}
            {exercise.actualValue != null && (
              <span className="ml-1 text-blue-600 dark:text-blue-400">
                (did: {exercise.actualValue}{exercise.actualSets != null ? ` in ${exercise.actualSets} sets` : ''})
              </span>
            )}
          </div>
        </div>

        {isOwn && (
          <button
            onClick={onExpand}
            className={`flex-shrink-0 p-2.5 rounded-xl transition-colors touch-target flex items-center justify-center ${
              isExpanded
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15'
                : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700/50'
            }`}
            aria-label="Edit details"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && isOwn && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex gap-3">
              <div className="flex-1 sm:flex-none">
                <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                  {exercise.targetType.startsWith('timed') ? 'Seconds' : 'Reps'}
                </label>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={exercise.targetValue?.toString() ?? ''}
                  className="w-full sm:w-20 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {hasSets && (
                <div className="flex-1 sm:flex-none">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Sets</label>
                  <input
                    type="number"
                    value={editSets}
                    onChange={(e) => setEditSets(e.target.value)}
                    placeholder={exercise.targetSets?.toString() ?? ''}
                    className="w-full sm:w-20 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Notes</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() =>
                onSave(
                  editValue ? Number(editValue) : null,
                  editSets ? Number(editSets) : null,
                  editNotes || null
                )
              }
              className="px-4 py-2.5 text-sm gradient-btn rounded-lg sm:flex-shrink-0"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Comment Section ---

function CommentSection({
  comments,
  onPost,
}: {
  comments: Comment[];
  onPost: (body: string) => void;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onPost(text.trim());
    setText('');
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Avatar name={c.authorName} avatarUrl={c.authorAvatarUrl} size="sm" className="mt-0.5" />
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-300">{c.authorName}</span>
                <span className="text-gray-400 dark:text-slate-500 ml-1 text-xs">
                  {new Date(c.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <p className="text-gray-600 dark:text-slate-400 mt-0.5 text-sm">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a comment..."
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3 py-2.5 text-sm gradient-btn rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
