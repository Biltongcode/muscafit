'use client';

import { useState } from 'react';
import { EXERCISE_CATALOGUE, CATALOGUE_CATEGORIES, CatalogueExercise } from '@/lib/exercise-catalogue';
import { ACTIVITY_CATALOGUE } from '@/lib/activity-catalogue';

interface QuickLogModalProps {
  date: string;
  isFutureDate: boolean;
  onClose: () => void;
  onSaved: () => void;
  onActivitySelect: (type: string) => void;
}

type Tab = 'exercise' | 'activity';

export default function QuickLogModal({ date, isFutureDate, onClose, onSaved, onActivitySelect }: QuickLogModalProps) {
  const [tab, setTab] = useState<Tab>('exercise');
  const [step, setStep] = useState<'pick' | 'log'>('pick');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<CatalogueExercise | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Exercise log form state
  const [actualValue, setActualValue] = useState('');
  const [actualSets, setActualSets] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [actualDistance, setActualDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('m');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Activity custom name state
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');

  const filtered = search.trim()
    ? EXERCISE_CATALOGUE.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const pickExercise = (ex: CatalogueExercise) => {
    setSelectedExercise(ex);
    setStep('log');
    if (ex.defaultTargetType === 'distance') {
      setDistanceUnit(ex.category === 'Swimming' ? 'm' : 'km');
    }
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise) return;
    setSaving(true);

    const tt = selectedExercise.defaultTargetType;
    const payload: Record<string, unknown> = {
      name: selectedExercise.name,
      targetType: tt,
      date,
      notes: notes || null,
    };

    if (tt === 'reps' || tt === 'reps_sets') {
      payload.actualValue = actualValue ? Number(actualValue) : null;
      payload.actualSets = actualSets ? Number(actualSets) : null;
    } else if (tt === 'timed' || tt === 'timed_sets') {
      payload.actualValue = actualValue ? Number(actualValue) : null;
      payload.actualSets = actualSets ? Number(actualSets) : null;
    } else if (tt === 'weighted') {
      payload.actualValue = actualValue ? Number(actualValue) : null;
      payload.actualSets = actualSets ? Number(actualSets) : null;
      payload.actualWeight = actualWeight ? Number(actualWeight) : null;
      payload.weightUnit = weightUnit;
    } else if (tt === 'distance') {
      payload.actualDistance = actualDistance ? Number(actualDistance) : null;
      payload.distanceUnit = distanceUnit;
    }

    try {
      const res = await fetch('/api/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSaved();
      }
    } catch {
      // silent
    }
    setSaving(false);
  };

  const handleActivityPick = (key: string) => {
    onClose();
    onActivitySelect(key);
  };

  const handleCustomSubmit = () => {
    const key = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (key) handleActivityPick(key);
  };

  const tt = selectedExercise?.defaultTargetType;
  const isReps = tt === 'reps' || tt === 'reps_sets';
  const isTimed = tt === 'timed' || tt === 'timed_sets';
  const isWeighted = tt === 'weighted';
  const isDistance = tt === 'distance';
  const hasSets = tt === 'reps_sets' || tt === 'timed_sets' || tt === 'weighted';

  const title = step === 'log' && selectedExercise
    ? selectedExercise.name
    : isFutureDate ? 'Plan' : 'Log';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 'log' && (
              <button onClick={() => { setStep('pick'); setSelectedExercise(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab switcher — only show on pick step */}
        {step === 'pick' && (
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="flex rounded-xl bg-gray-100 dark:bg-slate-700/50 p-0.5">
              {([['exercise', 'Exercise'], ['activity', 'Activity']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setSearch(''); setCustomMode(false); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    tab === key
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EXERCISE TAB */}
        {tab === 'exercise' && step === 'pick' && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                autoFocus
              />
            </div>

            {search.trim() ? (
              <div className="px-4 pb-4">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No exercises found</p>
                ) : (
                  <div className="space-y-1">
                    {filtered.slice(0, 15).map(ex => (
                      <button
                        key={ex.name}
                        onClick={() => pickExercise(ex)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{ex.name}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{ex.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-1">
                {CATALOGUE_CATEGORIES.map(cat => {
                  const isOpen = expandedCategory === cat;
                  const exercises = EXERCISE_CATALOGUE.filter(e => e.category === cat);
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => setExpandedCategory(isOpen ? null : cat)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-slate-500">{exercises.length}</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="ml-2 border-l-2 border-gray-100 dark:border-slate-700/50 pl-2 space-y-0.5 mt-1 mb-2">
                          {exercises.map(ex => (
                            <button
                              key={ex.name}
                              onClick={() => pickExercise(ex)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <span className="text-sm text-gray-700 dark:text-slate-300">{ex.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EXERCISE LOG FORM */}
        {tab === 'exercise' && step === 'log' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <p className="text-xs text-gray-400 dark:text-slate-500">Log what you actually did — this will show as completed.</p>

              {(isReps || isTimed) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    {isReps ? 'Reps' : 'Seconds'}
                  </label>
                  <input
                    type="number"
                    value={actualValue}
                    onChange={e => setActualValue(e.target.value)}
                    placeholder={isReps ? 'e.g. 20' : 'e.g. 60'}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    autoFocus
                  />
                </div>
              )}

              {hasSets && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Sets</label>
                  <input
                    type="number"
                    value={actualSets}
                    onChange={e => setActualSets(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>
              )}

              {isWeighted && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Reps per set</label>
                    <input
                      type="number"
                      value={actualValue}
                      onChange={e => setActualValue(e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Weight</label>
                      <input
                        type="number"
                        step="any"
                        value={actualWeight}
                        onChange={e => setActualWeight(e.target.value)}
                        placeholder="e.g. 80"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Unit</label>
                      <div className="flex rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden h-[42px]">
                        {(['kg', 'lbs'] as const).map(u => (
                          <button
                            key={u}
                            onClick={() => setWeightUnit(u)}
                            className={`flex-1 text-xs font-medium transition-colors ${
                              weightUnit === u
                                ? 'bg-cyan-500 text-white'
                                : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-600/50'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isDistance && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Distance</label>
                    <input
                      type="number"
                      step="any"
                      value={actualDistance}
                      onChange={e => setActualDistance(e.target.value)}
                      placeholder="e.g. 400"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      autoFocus
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Unit</label>
                    <div className="flex rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden h-[42px]">
                      {(['m', 'km', 'miles'] as const).map(u => (
                        <button
                          key={u}
                          onClick={() => setDistanceUnit(u)}
                          className={`flex-1 text-xs font-medium transition-colors ${
                            distanceUnit === u
                              ? 'bg-cyan-500 text-white'
                              : 'bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-600/50'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Felt strong today"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50 flex-shrink-0">
              <button
                onClick={handleSaveExercise}
                disabled={saving}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white gradient-btn disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Log Exercise'}
              </button>
            </div>
          </>
        )}

        {/* ACTIVITY TAB */}
        {tab === 'activity' && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {customMode ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">Enter a custom activity name:</p>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                  placeholder="e.g. Paddle boarding"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomMode(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customName.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white gradient-btn disabled:opacity-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {ACTIVITY_CATALOGUE.map(act => (
                    <button
                      key={act.key}
                      onClick={() => handleActivityPick(act.key)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="text-2xl">{act.emoji}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-slate-300 text-center leading-tight">{act.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCustomMode(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  + Custom activity
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
