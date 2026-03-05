'use client';

import { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';

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

interface Exercise {
  id: number;
  name: string;
}

interface GoalManagerProps {
  currentUserId: number;
  currentUserName: string;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatGoal(goal: Goal): string {
  const target = goal.targetValue.toLocaleString();
  if (goal.goalType === 'monthly' && goal.month) {
    return `${target} reps in ${MONTH_NAMES[goal.month - 1]} ${goal.year}`;
  }
  return `${target} reps in ${goal.year}`;
}

export default function GoalManager({ currentUserName }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [goalType, setGoalType] = useState<'yearly' | 'monthly'>('yearly');
  const [scope, setScope] = useState<'individual' | 'group'>('individual');
  const [targetValue, setTargetValue] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      setGoals(data.goals);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [goalsRes, exercisesRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/exercises?all=1'),
        ]);
        const goalsData = await goalsRes.json();
        const exercisesData = await exercisesRes.json();
        setGoals(goalsData.goals);
        setExercises(exercisesData.exercises);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setExerciseName('');
    setGoalType('yearly');
    setScope('individual');
    setTargetValue('');
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth() + 1);
    setAdding(false);
  };

  const saveGoal = async () => {
    if (!exerciseName || !targetValue) return;
    setSaving(true);

    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName,
          goalType,
          scope,
          targetValue: Number(targetValue),
          year,
          month: goalType === 'monthly' ? month : null,
        }),
      });
      await fetchGoals();
      resetForm();
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
    setSaving(false);
  };

  const deleteGoal = async (id: number) => {
    try {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      await fetchGoals();
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  // Deduplicate exercise names for dropdown
  const exerciseNames = Array.from(new Set(exercises.map(e => e.name))).sort();
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Goals</h2>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg transition-colors"
            >
              + Add Goal
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {goals.map(goal => (
              <div key={goal.id} className="glass rounded-xl shadow-sm">
                <div className="px-4 py-4 flex items-center gap-3">
                  {/* Progress circle */}
                  <div className="flex-shrink-0 w-12 h-12 relative">
                    <svg width={48} height={48} className="transform -rotate-90">
                      <circle cx={24} cy={24} r={20} fill="none" strokeWidth={4}
                        className="stroke-gray-200 dark:stroke-slate-700" />
                      <circle cx={24} cy={24} r={20} fill="none" strokeWidth={4}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(100, goal.percentComplete) / 100)}
                        className="stroke-blue-500 dark:stroke-blue-400 transition-all duration-500" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-slate-100">
                      {goal.percentComplete}%
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-slate-100">{goal.exerciseName}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{formatGoal(goal)}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                      {' \u00b7 '}
                      {goal.scope === 'group' ? 'Group' : goal.userName}
                    </div>
                  </div>

                  {/* Delete */}
                  <div>
                    {confirmDeleteId === goal.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="px-2 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(goal.id)}
                        className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                        aria-label="Delete goal"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {goals.length === 0 && !adding && (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <p>No goals yet.</p>
                <button
                  onClick={() => setAdding(true)}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Set your first goal
                </button>
              </div>
            )}

            {/* Add goal form */}
            {adding && (
              <div className="glass rounded-xl shadow-sm border-blue-200 dark:border-blue-500/30 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/30">
                  <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">New Goal</h3>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Exercise</label>
                    <select
                      value={exerciseName}
                      onChange={e => setExerciseName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select exercise...</option>
                      {exerciseNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                        <button
                          onClick={() => setGoalType('yearly')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            goalType === 'yearly' ? 'gradient-btn' : 'text-gray-600 dark:text-slate-400'
                          }`}
                        >
                          Yearly
                        </button>
                        <button
                          onClick={() => setGoalType('monthly')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            goalType === 'monthly' ? 'gradient-btn' : 'text-gray-600 dark:text-slate-400'
                          }`}
                        >
                          Monthly
                        </button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Scope</label>
                      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                        <button
                          onClick={() => setScope('individual')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            scope === 'individual' ? 'gradient-btn' : 'text-gray-600 dark:text-slate-400'
                          }`}
                        >
                          Just me
                        </button>
                        <button
                          onClick={() => setScope('group')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            scope === 'group' ? 'gradient-btn' : 'text-gray-600 dark:text-slate-400'
                          }`}
                        >
                          Group
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Target</label>
                      <input
                        type="number"
                        value={targetValue}
                        onChange={e => setTargetValue(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Year</label>
                      <select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    {goalType === 'monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Month</label>
                        <select
                          value={month}
                          onChange={e => setMonth(Number(e.target.value))}
                          className="px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {MONTH_NAMES.map((name, i) => (
                            <option key={i + 1} value={i + 1}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveGoal}
                      disabled={saving || !exerciseName || !targetValue}
                      className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
