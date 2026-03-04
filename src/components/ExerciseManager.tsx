'use client';

import { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';

interface Exercise {
  id: number;
  name: string;
  target_type: string;
  target_value: number | null;
  target_sets: number | null;
  target_per_set: number | null;
  notes: string | null;
  sort_order: number;
  is_active: number;
  schedule_days: string | null;
}

interface ExerciseManagerProps {
  currentUserId: number;
  currentUserName: string;
}

const TARGET_TYPES = [
  { value: 'reps', label: 'Reps' },
  { value: 'reps_sets', label: 'Reps in Sets' },
  { value: 'timed', label: 'Timed (seconds)' },
  { value: 'timed_sets', label: 'Timed Sets' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NUMBERS = ['1', '2', '3', '4', '5', '6', '7'];

function formatSchedule(scheduleDays: string | null): string {
  if (!scheduleDays) return 'Every day';
  const days = scheduleDays.split(',');
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes('6') && !days.includes('7')) return 'Weekdays';
  if (days.length === 2 && days.includes('6') && days.includes('7')) return 'Weekends';
  return days.map(d => DAY_NAMES[parseInt(d) - 1]).join(', ');
}

function formatTarget(ex: Exercise): string {
  switch (ex.target_type) {
    case 'reps':
      return `${ex.target_value} reps`;
    case 'reps_sets':
      return `${ex.target_value} in ${ex.target_sets}\u00d7${ex.target_per_set}`;
    case 'timed':
      return `${ex.target_value} sec`;
    case 'timed_sets': {
      const desc = `${ex.target_sets}\u00d7${ex.target_per_set} sec`;
      return ex.notes ? `${desc} (${ex.notes})` : desc;
    }
    default:
      return '';
  }
}

interface EditFormData {
  name: string;
  targetType: string;
  targetValue: string;
  targetSets: string;
  targetPerSet: string;
  notes: string;
  scheduleDays: string;
}

function emptyForm(): EditFormData {
  return { name: '', targetType: 'reps', targetValue: '', targetSets: '', targetPerSet: '', notes: '', scheduleDays: '' };
}

function exerciseToForm(ex: Exercise): EditFormData {
  return {
    name: ex.name,
    targetType: ex.target_type,
    targetValue: ex.target_value?.toString() ?? '',
    targetSets: ex.target_sets?.toString() ?? '',
    targetPerSet: ex.target_per_set?.toString() ?? '',
    notes: ex.notes ?? '',
    scheduleDays: ex.schedule_days ?? '',
  };
}

interface OtherUser {
  id: number;
  name: string;
}

export default function ExerciseManager({ currentUserId, currentUserName }: ExerciseManagerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<EditFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);
  const [browseUserId, setBrowseUserId] = useState<number | null>(null);
  const [browseExercises, setBrowseExercises] = useState<Exercise[]>([]);
  const [browseUserName, setBrowseUserName] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<number>>(new Set());

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exercises?all=1');
      const data = await res.json();
      setExercises(data.exercises);
    } catch (err) {
      console.error('Failed to fetch exercises:', err);
    }
    setLoading(false);
  }, []);

  // Fetch other users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        const others = data.users.filter((u: OtherUser) => u.id !== currentUserId);
        setOtherUsers(others);
        // Auto-select the first other user if there's only one
        if (others.length === 1) {
          setBrowseUserId(others[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // Fetch browsed user's exercises
  useEffect(() => {
    if (!browseUserId) {
      setBrowseExercises([]);
      setBrowseUserName('');
      return;
    }
    const fetchBrowse = async () => {
      setBrowseLoading(true);
      setCopiedIds(new Set());
      try {
        const res = await fetch(`/api/exercises?user_id=${browseUserId}`);
        const data = await res.json();
        setBrowseExercises(data.exercises);
        setBrowseUserName(data.userName);
      } catch (err) {
        console.error('Failed to fetch user exercises:', err);
      }
      setBrowseLoading(false);
    };
    fetchBrowse();
  }, [browseUserId]);

  const copyExercise = async (ex: Exercise) => {
    try {
      await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ex.name,
          targetType: ex.target_type,
          targetValue: ex.target_value,
          targetSets: ex.target_sets,
          targetPerSet: ex.target_per_set,
          notes: ex.notes,
          scheduleDays: ex.schedule_days,
        }),
      });
      setCopiedIds((prev) => new Set(prev).add(ex.id));
      await fetchExercises();
    } catch (err) {
      console.error('Failed to copy exercise:', err);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setForm(exerciseToForm(ex));
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setForm(emptyForm());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm());
  };

  const showSets = form.targetType === 'reps_sets' || form.targetType === 'timed_sets';

  const saveExercise = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      targetType: form.targetType,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      targetSets: showSets && form.targetSets ? Number(form.targetSets) : null,
      targetPerSet: showSets && form.targetPerSet ? Number(form.targetPerSet) : null,
      notes: form.notes.trim() || null,
      scheduleDays: form.scheduleDays || null,
    };

    try {
      if (editingId) {
        await fetch(`/api/exercises/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await fetchExercises();
      cancelEdit();
    } catch (err) {
      console.error('Failed to save exercise:', err);
    }
    setSaving(false);
  };

  const toggleActive = async (ex: Exercise) => {
    const newActive = ex.is_active ? 0 : 1;
    // Optimistic update
    setExercises((prev) =>
      prev.map((e) => (e.id === ex.id ? { ...e, is_active: newActive } : e))
    );
    try {
      await fetch(`/api/exercises/${ex.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });
    } catch {
      await fetchExercises();
    }
  };

  const moveExercise = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    const newOrder = [...exercises];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    setExercises(newOrder);

    try {
      await fetch('/api/exercises/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.map((e) => e.id) }),
      });
    } catch {
      await fetchExercises();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">My Exercises</h2>
          {!adding && (
            <button
              onClick={startAdd}
              className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg transition-colors"
            >
              + Add Exercise
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {exercises.map((ex, index) => {
              const isEditing = editingId === ex.id;

              if (isEditing) {
                return (
                  <ExerciseForm
                    key={ex.id}
                    form={form}
                    setForm={setForm}
                    showSets={showSets}
                    onSave={saveExercise}
                    onCancel={cancelEdit}
                    saving={saving}
                    title="Edit Exercise"
                  />
                );
              }

              return (
                <div
                  key={ex.id}
                  className={`glass rounded-xl shadow-sm transition-opacity ${
                    !ex.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="px-4 py-4 flex items-center gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveExercise(index, -1)}
                        disabled={index === 0}
                        className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveExercise(index, 1)}
                        disabled={index === exercises.length - 1}
                        className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Exercise info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-slate-100">{ex.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{formatTarget(ex)}</div>
                      {ex.schedule_days && (
                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{formatSchedule(ex.schedule_days)}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(ex)}
                        className={`px-3 py-2 text-xs font-medium rounded-full transition-colors touch-target flex items-center ${
                          ex.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/25'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                      >
                        {ex.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => startEdit(ex)}
                        className="p-2.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors touch-target flex items-center justify-center"
                        aria-label="Edit exercise"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new exercise form */}
            {adding && (
              <ExerciseForm
                form={form}
                setForm={setForm}
                showSets={showSets}
                onSave={saveExercise}
                onCancel={cancelEdit}
                saving={saving}
                title="New Exercise"
              />
            )}

            {exercises.length === 0 && !adding && (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <p>No exercises yet.</p>
                <button
                  onClick={startAdd}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Add your first exercise
                </button>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400 dark:text-slate-500 text-center">
          Deactivating an exercise hides it from future daily views but keeps your historical logs.
        </p>

        {/* Browse other users' exercises */}
        {otherUsers.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {browseUserName ? `${browseUserName}'s Exercises` : 'Browse Exercises'}
              </h2>
              {otherUsers.length > 1 && (
                <select
                  value={browseUserId ?? ''}
                  onChange={(e) => setBrowseUserId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user...</option>
                  {otherUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>

            {browseLoading ? (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500">Loading...</div>
            ) : browseExercises.length > 0 ? (
              <div className="space-y-2">
                {browseExercises.map((ex) => {
                  const isCopied = copiedIds.has(ex.id);
                  return (
                    <div key={ex.id} className="glass rounded-xl shadow-sm">
                      <div className="px-4 py-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-slate-100">{ex.name}</div>
                          <div className="text-sm text-gray-500 dark:text-slate-400">{formatTarget(ex)}</div>
                          {ex.schedule_days && (
                            <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{formatSchedule(ex.schedule_days)}</div>
                          )}
                        </div>
                        <button
                          onClick={() => copyExercise(ex)}
                          disabled={isCopied}
                          className={`px-4 py-2.5 text-xs font-medium rounded-lg transition-colors touch-target flex items-center ${
                            isCopied
                              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 cursor-default'
                              : 'gradient-btn'
                          }`}
                        >
                          {isCopied ? 'Added' : '+ Add to mine'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : browseUserId ? (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                No exercises configured yet.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Exercise Edit/Add Form ---

function ExerciseForm({
  form,
  setForm,
  showSets,
  onSave,
  onCancel,
  saving,
  title,
}: {
  form: EditFormData;
  setForm: (f: EditFormData) => void;
  showSets: boolean;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <div className="glass rounded-xl shadow-sm border-blue-200 dark:border-blue-500/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/30">
        <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">{title}</h3>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Press ups"
            autoFocus
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
          <select
            value={form.targetType}
            onChange={(e) => setForm({ ...form, targetType: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              {form.targetType.startsWith('timed') ? 'Seconds' : 'Total Reps'}
            </label>
            <input
              type="number"
              value={form.targetValue}
              onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
              placeholder="e.g. 125"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
            />
          </div>

          {showSets && (
            <>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sets</label>
                <input
                  type="number"
                  value={form.targetSets}
                  onChange={(e) => setForm({ ...form, targetSets: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Per Set</label>
                <input
                  type="number"
                  value={form.targetPerSet}
                  onChange={(e) => setForm({ ...form, targetPerSet: e.target.value })}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
                />
              </div>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. each side"
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Schedule</label>
          <DayPicker
            selectedDays={form.scheduleDays}
            onChange={(days) => setForm({ ...form, scheduleDays: days })}
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            All selected = every day. Deselect days for rest days.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Day Picker for scheduling ---

function DayPicker({ selectedDays, onChange }: { selectedDays: string; onChange: (days: string) => void }) {
  const selected = selectedDays ? selectedDays.split(',') : DAY_NUMBERS;
  const allSelected = selected.length === 7 || selectedDays === '';

  const toggle = (dayNum: string) => {
    let newSelected: string[];
    if (allSelected) {
      // Switching from "every day" to specific: uncheck this one day
      newSelected = DAY_NUMBERS.filter(d => d !== dayNum);
    } else if (selected.includes(dayNum)) {
      // Don't allow deselecting the last day — reset to all instead
      if (selected.length === 1) {
        onChange('');
        return;
      }
      newSelected = selected.filter(d => d !== dayNum);
    } else {
      newSelected = [...selected, dayNum].sort();
    }
    // If all 7 are selected, store as empty (= every day)
    onChange(newSelected.length === 7 ? '' : newSelected.join(','));
  };

  return (
    <div className="flex gap-1.5">
      {DAY_NAMES.map((label, i) => {
        const dayNum = DAY_NUMBERS[i];
        const isSelected = allSelected || selected.includes(dayNum);
        return (
          <button
            key={dayNum}
            type="button"
            onClick={() => toggle(dayNum)}
            className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
              isSelected
                ? 'gradient-btn'
                : 'bg-gray-100 text-gray-400 dark:bg-slate-700/50 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-600/50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
