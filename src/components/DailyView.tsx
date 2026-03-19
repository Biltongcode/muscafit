'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import NavBar from './NavBar';
import Avatar from './Avatar';
import ChallengeModal from './ChallengeModal';
import ChallengeTokens from './ChallengeTokens';
import { ACTIVITY_CATALOGUE, getActivityType, getActivityColorClasses } from '@/lib/activity-catalogue';

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
  targetWeight: number | null;
  weightUnit: string | null;
  targetDistance: number | null;
  distanceUnit: string | null;
  completed: boolean;
  actualValue: number | null;
  actualSets: number | null;
  actualWeight: number | null;
  actualDistance: number | null;
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
  status: 'planned' | 'completed';
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

interface FireReaction {
  userId: number;
  userName: string;
}

interface Challenge {
  id: number;
  challenger_id: number;
  challenged_id: number;
  challenger_name: string;
  challenged_name: string;
  exercise_name: string;
  target_type: string;
  target_value: number | null;
  target_sets: number | null;
  target_per_set: number | null;
  target_weight: number | null;
  weight_unit: string | null;
  target_distance: number | null;
  distance_unit: string | null;
  challenge_date: string;
  status: string;
}

interface DailyViewProps {
  currentUserId: number;
  currentUserName: string;
  currentUserAvatar?: string | null;
}

// --- Helpers ---

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
    case 'weighted':
      return `${ex.targetSets}\u00d7${ex.targetPerSet} @ ${ex.targetWeight}${ex.weightUnit || 'kg'}`;
    case 'distance': {
      const unit = ex.distanceUnit || 'm';
      return `${ex.targetDistance}${unit === 'm' ? 'm' : ' ' + unit}`;
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

// --- Main Component ---

export default function DailyView({ currentUserId, currentUserName, currentUserAvatar }: DailyViewProps) {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get('date') || getTodayStr();
  const [date, setDate] = useState(initialDate);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [activityModal, setActivityModal] = useState<{
    userId: number;
    type: string;
    existing: Activity | null;
  } | null>(null);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [fireReactions, setFireReactions] = useState<Record<number, FireReaction[]>>({});
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeModal, setChallengeModal] = useState<{ userId: number; name: string } | null>(null);

  const isToday = date === getTodayStr();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, activitiesRes, commentsRes, reactionsRes, challengesRes] = await Promise.all([
        fetch(`/api/logs?date=${date}`),
        fetch(`/api/activities?date=${date}`),
        fetch(`/api/comments?date=${date}`),
        fetch(`/api/reactions?date=${date}`),
        fetch(`/api/challenges?date=${date}`),
      ]);
      const logsData = await logsRes.json();
      const activitiesData = await activitiesRes.json();
      const commentsData = await commentsRes.json();
      const reactionsData = await reactionsRes.json();
      const challengesData = await challengesRes.json();
      setUsers(logsData.users);
      setActivities(activitiesData.activities);
      setComments(commentsData.comments);
      setFireReactions(reactionsData.reactions || {});
      setChallenges(challengesData.challenges || []);
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
    setShowActivityPicker(false);
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

  const saveDetails = async (logId: number, actualValue: number | null, actualSets: number | null, actualWeight: number | null, notes: string | null, actualDistance?: number | null) => {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualValue, actualSets, actualWeight, actualDistance, notes }),
      });

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          exercises: u.exercises.map((e) => {
            if (e.logId !== logId) return e;
            return { ...e, actualValue, actualSets, actualWeight, actualDistance: actualDistance ?? e.actualDistance, logNotes: notes };
          }),
        }))
      );
    } catch (err) {
      console.error('Failed to save details:', err);
    }
    setExpandedLog(null);
  };

  // --- Fire reaction handler ---

  const toggleFire = async (logId: number) => {
    // Optimistic update
    setFireReactions((prev) => {
      const existing = prev[logId] || [];
      const alreadyFired = existing.some((r) => r.userId === currentUserId);
      if (alreadyFired) {
        const updated = existing.filter((r) => r.userId !== currentUserId);
        return { ...prev, [logId]: updated };
      } else {
        return { ...prev, [logId]: [...existing, { userId: currentUserId, userName: currentUserName }] };
      }
    });

    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
    } catch {
      // Revert on error
      fetchData();
    }
  };

  // --- Activity handlers ---

  const handleActivityCardClick = (activity: Activity) => {
    if (activity.userId !== currentUserId) return;
    setActivityModal({ userId: activity.userId, type: activity.activityType, existing: activity });
  };

  const handlePickerSelect = (type: string) => {
    setShowActivityPicker(false);
    setActivityModal({ userId: currentUserId, type, existing: null });
  };

  const isFutureDate = date > getTodayStr();

  const saveActivity = async (durationMinutes: number | null, distanceKm: number | null, notes: string | null, markDone?: boolean) => {
    if (!activityModal) return;
    const { type, existing } = activityModal;

    try {
      if (existing) {
        // If marking a planned activity as done, set status to completed
        const updateStatus = markDone ? 'completed' : existing.status;
        await fetch(`/api/activities/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationMinutes, distanceKm, notes, status: updateStatus }),
        });
      } else {
        // New activity: planned if future date, completed otherwise
        const status = isFutureDate ? 'planned' : 'completed';
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, activityType: type, durationMinutes, distanceKm, notes, status }),
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
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? data.comment : c))
      );
    } catch {
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
              <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Today</span>
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
              onClick={() => { setDate(getTodayStr()); setExpandedLog(null); setActivityModal(null); setShowActivityPicker(false); }}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <ChallengeTokens compact />

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {sortedUsers.map((user) => {
              const completed = user.exercises.filter((e) => e.completed).length;
              const total = user.exercises.length;
              const isOwn = user.id === currentUserId;
              const userActivities = activities.filter((a) => a.userId === user.id);
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
                    <div className="flex items-center gap-2">
                      {!isOwn && (
                        <button
                          onClick={() => setChallengeModal({ userId: user.id, name: user.name })}
                          className="text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/15 dark:to-violet-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30 hover:from-cyan-500/20 hover:to-violet-500/20 transition-all"
                          title="Send a challenge"
                        >
                          Challenge
                        </button>
                      )}
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
                          onSave={(val, sets, weight, notes, dist) => saveDetails(ex.logId, val, sets, weight, notes, dist)}
                          fires={fireReactions[ex.logId] || []}
                          currentUserId={currentUserId}
                          onFire={() => toggleFire(ex.logId)}
                        />
                      ))
                    )}
                  </div>

                  {/* Challenge rows */}
                  {challenges
                    .filter(c => c.challenged_id === user.id && c.status !== 'declined')
                    .map(c => (
                      <ChallengeRow
                        key={`challenge-${c.id}`}
                        challenge={c}
                        isOwn={user.id === currentUserId}
                        onAction={async (action) => {
                          await fetch(`/api/challenges/${c.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action }),
                          });
                          fetchData();
                        }}
                      />
                    ))
                  }

                  {/* Activity Cards */}
                  <ActivityCards
                    userActivities={userActivities}
                    isOwn={isOwn}
                    isFutureDate={isFutureDate}
                    onCardClick={handleActivityCardClick}
                    onAddClick={() => setShowActivityPicker(true)}
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

      {/* Activity Picker Modal */}
      {showActivityPicker && (
        <ActivityPicker
          onSelect={handlePickerSelect}
          onClose={() => setShowActivityPicker(false)}
        />
      )}

      {/* Activity Detail Modal */}
      {activityModal && (
        <ActivityModal
          type={activityModal.type}
          existing={activityModal.existing}
          isFutureDate={isFutureDate}
          onSave={saveActivity}
          onDelete={activityModal.existing ? deleteActivity : undefined}
          onClose={() => setActivityModal(null)}
        />
      )}

      {/* Challenge Modal */}
      {challengeModal && (
        <ChallengeModal
          targetUserId={challengeModal.userId}
          targetUserName={challengeModal.name}
          date={date}
          onClose={() => setChallengeModal(null)}
          onSent={() => { setChallengeModal(null); fetchData(); }}
        />
      )}
    </div>
  );
}

// --- Challenge Row ---

function formatChallengeTarget(c: Challenge): string {
  if (c.target_type === 'distance') return `${c.target_distance}${c.distance_unit === 'm' ? 'm' : ' ' + c.distance_unit}`;
  if (c.target_type === 'weighted') return `${c.target_sets}\u00d7${c.target_per_set} @ ${c.target_weight}${c.weight_unit || 'kg'}`;
  if (c.target_type === 'reps_sets') return `${c.target_value} in ${c.target_sets}\u00d7${c.target_per_set}`;
  if (c.target_type?.startsWith('timed')) return `${c.target_value} sec`;
  return `${c.target_value} reps`;
}

function ChallengeRow({ challenge: c, isOwn, onAction }: {
  challenge: Challenge;
  isOwn: boolean;
  onAction: (action: 'accept' | 'decline' | 'complete') => void;
}) {
  const [acting, setActing] = useState(false);

  const handleAction = async (action: 'accept' | 'decline' | 'complete') => {
    setActing(true);
    await onAction(action);
    setActing(false);
  };

  return (
    <div className="mx-3 my-2 rounded-xl border-2 border-dashed border-cyan-500/40 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-violet-500/5 dark:from-cyan-500/10 dark:to-violet-500/10 p-3 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">&#x2694;&#xFE0F;</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.exercise_name}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {formatChallengeTarget(c)} &middot; from {c.challenger_name}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {c.status === 'pending' && isOwn && (
            <>
              <button onClick={() => handleAction('accept')} disabled={acting}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors disabled:opacity-50">
                Accept
              </button>
              <button onClick={() => handleAction('decline')} disabled={acting}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                Decline
              </button>
            </>
          )}
          {c.status === 'pending' && !isOwn && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending</span>
          )}
          {c.status === 'accepted' && isOwn && (
            <button onClick={() => handleAction('complete')} disabled={acting}
              className="px-3 py-1 text-xs font-bold rounded-lg gradient-btn disabled:opacity-50">
              Done!
            </button>
          )}
          {c.status === 'accepted' && !isOwn && (
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Accepted</span>
          )}
          {c.status === 'completed' && (
            <span className="text-lg" title="Challenge completed!">&#x1F37A;</span>
          )}
          {c.status === 'failed' && (
            <span className="text-lg" title="Challenge failed!">&#x1F4A9;</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Activity Cards ---

function ActivityCards({
  userActivities,
  isOwn,
  isFutureDate,
  onCardClick,
  onAddClick,
}: {
  userActivities: Activity[];
  isOwn: boolean;
  isFutureDate: boolean;
  onCardClick: (activity: Activity) => void;
  onAddClick: () => void;
}) {
  if (!isOwn && userActivities.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
      {userActivities.length > 0 && (
        <div className="space-y-2 mb-2">
          {userActivities.map((activity) => {
            const actType = getActivityType(activity.activityType);
            const colors = getActivityColorClasses(actType.color);
            const isPlanned = activity.status === 'planned';

            return (
              <button
                key={activity.id}
                onClick={() => onCardClick(activity)}
                disabled={!isOwn}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isPlanned
                    ? `border-2 border-dashed ${colors.border} bg-white/50 dark:bg-slate-900/30`
                    : `border ${colors.bg} ${colors.border}`
                } ${isOwn ? 'cursor-pointer hover:shadow-sm active:scale-[0.98]' : 'cursor-default'}`}
              >
                <span className={`text-lg flex-shrink-0 ${isPlanned ? 'opacity-60' : ''}`} role="img" aria-label={actType.label}>
                  {actType.emoji}
                </span>
                <span className={`text-sm font-medium flex-shrink-0 ${isPlanned ? 'text-gray-500 dark:text-slate-400' : colors.text}`}>
                  {actType.label}
                </span>
                <div className="flex items-center gap-2 ml-auto text-xs">
                  {isPlanned && (
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                      Planned
                    </span>
                  )}
                  {activity.durationMinutes != null && (
                    <span className={`font-medium ${colors.text}`}>
                      {activity.durationMinutes}m
                    </span>
                  )}
                  {activity.distanceKm != null && activity.distanceKm > 0 && (
                    <span className={`${colors.text} opacity-75`}>
                      {activity.distanceKm} km
                    </span>
                  )}
                  {activity.notes && (
                    <span className="text-gray-400 dark:text-slate-500 truncate max-w-[100px]" title={activity.notes}>
                      {activity.notes}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOwn && (
        <button
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-gray-400 dark:hover:border-slate-500 transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isFutureDate ? 'Plan activity' : 'Log activity'}
        </button>
      )}
    </div>
  );
}

// --- Activity Picker ---

function ActivityPicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');

  const handleCustomSubmit = () => {
    const key = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (key) {
      onSelect(key);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative glass rounded-xl shadow-xl dark:shadow-glow w-full max-w-md animate-scale-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
            {customMode ? 'Custom Activity' : 'Choose Activity'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {customMode ? (
          <div className="p-4 space-y-3">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Surfing"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customName.trim()}
                className="flex-1 py-2.5 gradient-btn rounded-lg text-sm disabled:opacity-40"
              >
                Continue
              </button>
              <button
                onClick={() => { setCustomMode(false); setCustomName(''); }}
                className="px-4 py-2.5 text-gray-600 dark:text-slate-400 text-sm rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Activity grid */}
            <div className="overflow-y-auto flex-1 p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {ACTIVITY_CATALOGUE.map((at) => {
                  const colors = getActivityColorClasses(at.color);
                  return (
                    <button
                      key={at.key}
                      onClick={() => onSelect(at.key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:shadow-sm active:scale-95 ${colors.bg} ${colors.border}`}
                    >
                      <span className="text-xl">{at.emoji}</span>
                      <span className={`text-xs font-medium ${colors.text} leading-tight text-center`}>{at.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom option */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50 flex-shrink-0">
              <button
                onClick={() => setCustomMode(true)}
                className="w-full text-center text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 py-2"
              >
                + Custom activity
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Activity Modal ---

function ActivityModal({
  type,
  existing,
  isFutureDate,
  onSave,
  onDelete,
  onClose,
}: {
  type: string;
  existing: Activity | null;
  isFutureDate: boolean;
  onSave: (durationMinutes: number | null, distanceKm: number | null, notes: string | null, markDone?: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [duration, setDuration] = useState(existing?.durationMinutes?.toString() ?? '');
  const [distance, setDistance] = useState(existing?.distanceKm?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const actType = getActivityType(type);
  const colors = getActivityColorClasses(actType.color);
  const isPlanned = existing?.status === 'planned';
  // Can mark done if it's a planned activity and the date is today or in the past
  const canMarkDone = isPlanned && !isFutureDate;

  // Title logic
  let title: string;
  if (existing) {
    title = isPlanned ? `Planned ${actType.label}` : `Edit ${actType.label}`;
  } else {
    title = isFutureDate ? `Plan ${actType.label}` : `Log ${actType.label}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div className="relative glass rounded-xl shadow-xl dark:shadow-glow w-full max-w-sm p-5 animate-scale-in">
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
            <span className="text-lg">{actType.emoji}</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
            {title}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 45"
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. easy pace, won 3-1"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {/* Mark as done — prominent green button for planned activities on today/past */}
          {canMarkDone && (
            <button
              onClick={() => onSave(
                duration ? Number(duration) : null,
                distance ? Number(distance) : null,
                notes || null,
                true
              )}
              className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
            >
              Mark as done
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onSave(
                duration ? Number(duration) : null,
                distance ? Number(distance) : null,
                notes || null
              )}
              className="flex-1 py-2.5 gradient-btn rounded-lg text-sm"
            >
              {existing ? 'Update' : isFutureDate ? 'Plan' : 'Save'}
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
  onSave: (actualValue: number | null, actualSets: number | null, actualWeight: number | null, notes: string | null, actualDistance?: number | null) => void;
  fires: FireReaction[];
  currentUserId: number;
  onFire: () => void;
}

function ExerciseRow({ exercise, isOwn, isExpanded, onToggle, onExpand, onSave, fires, currentUserId, onFire }: ExerciseRowProps) {
  const [editValue, setEditValue] = useState<string>(exercise.actualValue?.toString() ?? '');
  const [editSets, setEditSets] = useState<string>(exercise.actualSets?.toString() ?? '');
  const [editWeight, setEditWeight] = useState<string>(exercise.actualWeight?.toString() ?? exercise.targetWeight?.toString() ?? '');
  const [editDistance, setEditDistance] = useState<string>(exercise.actualDistance?.toString() ?? exercise.targetDistance?.toString() ?? '');
  const [editNotes, setEditNotes] = useState<string>(exercise.logNotes ?? '');
  const [justChecked, setJustChecked] = useState(false);

  useEffect(() => {
    setEditValue(exercise.actualValue?.toString() ?? '');
    setEditSets(exercise.actualSets?.toString() ?? '');
    setEditWeight(exercise.actualWeight?.toString() ?? exercise.targetWeight?.toString() ?? '');
    setEditDistance(exercise.actualDistance?.toString() ?? exercise.targetDistance?.toString() ?? '');
    setEditNotes(exercise.logNotes ?? '');
  }, [exercise.actualValue, exercise.actualSets, exercise.actualWeight, exercise.targetWeight, exercise.actualDistance, exercise.targetDistance, exercise.logNotes]);

  const hasSets = exercise.targetType === 'reps_sets' || exercise.targetType === 'timed_sets' || exercise.targetType === 'weighted';
  const isWeighted = exercise.targetType === 'weighted';
  const isDistanceType = exercise.targetType === 'distance';

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
              <span className="ml-1 text-cyan-600 dark:text-cyan-400">
                (did: {exercise.actualValue}
                {exercise.actualSets != null ? ` in ${exercise.actualSets} sets` : ''}
                {isWeighted && exercise.actualWeight != null ? ` @ ${exercise.actualWeight}${exercise.weightUnit || 'kg'}` : ''})
              </span>
            )}
            {isDistanceType && exercise.actualDistance != null && (
              <span className="ml-1 text-cyan-600 dark:text-cyan-400">
                (did: {exercise.actualDistance}{exercise.distanceUnit === 'm' ? 'm' : ' ' + (exercise.distanceUnit || 'm')})
              </span>
            )}
          </div>
        </div>

        {/* Fire reaction button + count */}
        {exercise.completed && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {fires.length > 0 && (
              <span
                className="text-xs font-medium text-orange-500 dark:text-orange-400 min-w-[1rem] text-center"
                title={fires.map((f) => f.userName).join(', ')}
              >
                {fires.length}
              </span>
            )}
            {!isOwn && (
              <button
                onClick={onFire}
                className={`p-2 rounded-xl transition-all touch-target flex items-center justify-center ${
                  fires.some((f) => f.userId === currentUserId)
                    ? 'animate-fire-pop'
                    : 'grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                }`}
                aria-label="Give fire"
                title={fires.some((f) => f.userId === currentUserId) ? 'Remove fire' : 'Give fire'}
              >
                <span className="text-lg">🔥</span>
              </button>
            )}
          </div>
        )}

        {isOwn && (
          <button
            onClick={onExpand}
            className={`flex-shrink-0 p-2.5 rounded-xl transition-colors touch-target flex items-center justify-center ${
              isExpanded
                ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/15'
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
              {isDistanceType ? (
                <div className="flex-1 sm:flex-none">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                    Distance ({exercise.distanceUnit || 'm'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editDistance}
                    onChange={(e) => setEditDistance(e.target.value)}
                    placeholder={exercise.targetDistance?.toString() ?? ''}
                    className="w-full sm:w-24 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : (
                <div className="flex-1 sm:flex-none">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                    {exercise.targetType.startsWith('timed') ? 'Seconds' : 'Reps'}
                  </label>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={exercise.targetValue?.toString() ?? ''}
                    className="w-full sm:w-20 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              {hasSets && (
                <div className="flex-1 sm:flex-none">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Sets</label>
                  <input
                    type="number"
                    value={editSets}
                    onChange={(e) => setEditSets(e.target.value)}
                    placeholder={exercise.targetSets?.toString() ?? ''}
                    className="w-full sm:w-20 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              {isWeighted && (
                <div className="flex-1 sm:flex-none">
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">
                    Weight ({exercise.weightUnit || 'kg'})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder={exercise.targetWeight?.toString() ?? ''}
                    className="w-full sm:w-20 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <button
              onClick={() =>
                onSave(
                  editValue ? Number(editValue) : null,
                  editSets ? Number(editSets) : null,
                  isWeighted && editWeight ? Number(editWeight) : null,
                  editNotes || null,
                  isDistanceType && editDistance ? Number(editDistance) : null
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
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500"
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
