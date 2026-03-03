'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';

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
  exercises: Exercise[];
}

interface DailyViewProps {
  currentUserId: number;
  currentUserName: string;
}

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

export default function DailyView({ currentUserId, currentUserName }: DailyViewProps) {
  const [date, setDate] = useState(getTodayStr);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const isToday = date === getTodayStr();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
    setExpandedLog(null);
  };

  const toggleExercise = async (userId: number, logId: number, exerciseId: number, currentCompleted: boolean) => {
    if (userId !== currentUserId) return;

    // Optimistic update
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
        body: JSON.stringify({
          exerciseId,
          date,
          completed: !currentCompleted,
        }),
      });
    } catch {
      fetchLogs();
    }
  };

  const saveDetails = async (logId: number, actualValue: number | null, actualSets: number | null, notes: string | null) => {
    try {
      await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualValue, actualSets, notes }),
      });

      // Update local state
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

  // Sort: put current user first
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Muscafit</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{currentUserName}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Date Navigation */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-600"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h2>
            {isToday && (
              <span className="text-xs font-medium text-blue-600">Today</span>
            )}
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 rounded-md hover:bg-gray-200 text-gray-600"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!isToday && (
            <button
              onClick={() => { setDate(getTodayStr()); setExpandedLog(null); }}
              className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
            >
              Today
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedUsers.map((user) => {
              const completed = user.exercises.filter((e) => e.completed).length;
              const total = user.exercises.length;
              const isOwn = user.id === currentUserId;

              return (
                <div key={user.id} className="bg-white rounded-lg shadow">
                  {/* User header */}
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {user.name}
                      {isOwn && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                    </h3>
                    {total > 0 && (
                      <span
                        className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                          completed === total
                            ? 'bg-green-100 text-green-700'
                            : completed > 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {completed}/{total}
                      </span>
                    )}
                  </div>

                  {/* Exercise list */}
                  <div className="divide-y">
                    {user.exercises.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No exercises configured
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
                </div>
              );
            })}
          </div>
        )}
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

  // Sync when exercise prop changes
  useEffect(() => {
    setEditValue(exercise.actualValue?.toString() ?? '');
    setEditSets(exercise.actualSets?.toString() ?? '');
    setEditNotes(exercise.logNotes ?? '');
  }, [exercise.actualValue, exercise.actualSets, exercise.logNotes]);

  const hasSets = exercise.targetType === 'reps_sets' || exercise.targetType === 'timed_sets';

  return (
    <div className={`transition-colors ${exercise.completed ? 'bg-green-50' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={isOwn ? onToggle : undefined}
          disabled={!isOwn}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            exercise.completed
              ? 'bg-green-500 border-green-500 text-white'
              : isOwn
              ? 'border-gray-300 hover:border-green-400'
              : 'border-gray-200'
          } ${isOwn ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={exercise.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {exercise.completed && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${exercise.completed ? 'text-green-800' : 'text-gray-900'}`}>
            {exercise.name}
          </div>
          <div className="text-xs text-gray-500">
            {formatTarget(exercise)}
            {exercise.actualValue != null && (
              <span className="ml-1 text-blue-600">
                (did: {exercise.actualValue}{exercise.actualSets != null ? ` in ${exercise.actualSets} sets` : ''})
              </span>
            )}
          </div>
        </div>

        {/* Edit button (own exercises only) */}
        {isOwn && (
          <button
            onClick={onExpand}
            className={`flex-shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors ${
              isExpanded ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
            }`}
            aria-label="Edit details"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded edit form */}
      {isExpanded && isOwn && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {exercise.targetType.startsWith('timed') ? 'Seconds' : 'Reps'}
              </label>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={exercise.targetValue?.toString() ?? ''}
                className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {hasSets && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sets</label>
                <input
                  type="number"
                  value={editSets}
                  onChange={(e) => setEditSets(e.target.value)}
                  placeholder={exercise.targetSets?.toString() ?? ''}
                  className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
