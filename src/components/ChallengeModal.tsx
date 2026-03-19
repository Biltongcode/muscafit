'use client';

import { useState, useEffect } from 'react';
import { EXERCISE_CATALOGUE, CATALOGUE_CATEGORIES } from '@/lib/exercise-catalogue';

interface ChallengeModalProps {
  targetUserId: number;
  targetUserName: string;
  date: string;
  onClose: () => void;
  onSent: () => void;
}

export default function ChallengeModal({ targetUserId, targetUserName, date, onClose, onSent }: ChallengeModalProps) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<{ name: string; targetType: string } | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [targetSets, setTargetSets] = useState('');
  const [targetPerSet, setTargetPerSet] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [targetDistance, setTargetDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('m');
  const [challengeDate, setChallengeDate] = useState(date);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filteredExercises = search.trim()
    ? EXERCISE_CATALOGUE.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const pickExercise = (name: string, targetType: string) => {
    setSelectedExercise({ name, targetType });
    setStep('configure');
    setSearch('');
  };

  const handleSend = async () => {
    if (!selectedExercise) return;
    setSending(true);
    setError('');

    const payload: Record<string, unknown> = {
      challengedId: targetUserId,
      exerciseName: selectedExercise.name,
      targetType: selectedExercise.targetType,
      challengeDate,
    };

    const tt = selectedExercise.targetType;
    if (tt === 'reps') {
      payload.targetValue = Number(targetValue);
    } else if (tt === 'reps_sets') {
      payload.targetSets = Number(targetSets);
      payload.targetPerSet = Number(targetPerSet);
      payload.targetValue = Number(targetSets) * Number(targetPerSet);
    } else if (tt === 'timed' || tt === 'timed_sets') {
      payload.targetValue = Number(targetValue);
      if (tt === 'timed_sets') {
        payload.targetSets = Number(targetSets);
        payload.targetPerSet = Number(targetPerSet);
      }
    } else if (tt === 'weighted') {
      payload.targetSets = Number(targetSets);
      payload.targetPerSet = Number(targetPerSet);
      payload.targetWeight = Number(targetWeight);
      payload.weightUnit = weightUnit;
      payload.targetValue = Number(targetSets) * Number(targetPerSet);
    } else if (tt === 'distance') {
      payload.targetDistance = Number(targetDistance);
      payload.distanceUnit = distanceUnit;
    }

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send challenge');
        setSending(false);
        return;
      }
      onSent();
    } catch {
      setError('Failed to send challenge');
      setSending(false);
    }
  };

  const formatTargetPreview = () => {
    if (!selectedExercise) return '';
    const tt = selectedExercise.targetType;
    if (tt === 'reps') return `${targetValue || '?'} reps`;
    if (tt === 'reps_sets') return `${targetSets || '?'}x${targetPerSet || '?'}`;
    if (tt === 'timed') return `${targetValue || '?'} seconds`;
    if (tt === 'timed_sets') return `${targetSets || '?'}x${targetPerSet || '?'} sec`;
    if (tt === 'weighted') return `${targetSets || '?'}x${targetPerSet || '?'} @ ${targetWeight || '?'}${weightUnit}`;
    if (tt === 'distance') return `${targetDistance || '?'}${distanceUnit === 'm' ? 'm' : ' ' + distanceUnit}`;
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl dark:shadow-glow-lg max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700/50 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Challenge {targetUserName}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Pick an exercise and set a target</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'pick' ? (
          <div className="flex-1 overflow-y-auto p-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:placeholder-slate-500 mb-3"
              autoFocus
            />

            {search.trim() ? (
              <div className="space-y-1">
                {filteredExercises.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No exercises found</p>
                )}
                {filteredExercises.map(ex => (
                  <button
                    key={ex.name}
                    onClick={() => pickExercise(ex.name, ex.defaultTargetType)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">{ex.category}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {CATALOGUE_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                    >
                      {cat}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategory === cat ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedCategory === cat && (
                      <div className="ml-2 space-y-0.5 mb-2">
                        {EXERCISE_CATALOGUE.filter(e => e.category === cat).map(ex => (
                          <button
                            key={ex.name}
                            onClick={() => pickExercise(ex.name, ex.defaultTargetType)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            {ex.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Selected exercise */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/15 dark:to-violet-500/15 rounded-xl p-4 border border-cyan-500/20 dark:border-cyan-500/30">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedExercise?.name}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {formatTargetPreview()}
              </p>
            </div>

            {/* Target inputs based on type */}
            {selectedExercise?.targetType === 'reps' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Target Reps</label>
                <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)}
                  placeholder="e.g. 100" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            )}

            {selectedExercise?.targetType === 'reps_sets' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sets</label>
                  <input type="number" value={targetSets} onChange={e => setTargetSets(e.target.value)}
                    placeholder="3" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reps per set</label>
                  <input type="number" value={targetPerSet} onChange={e => setTargetPerSet(e.target.value)}
                    placeholder="10" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
            )}

            {(selectedExercise?.targetType === 'timed') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Target (seconds)</label>
                <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)}
                  placeholder="e.g. 60" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            )}

            {selectedExercise?.targetType === 'timed_sets' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sets</label>
                  <input type="number" value={targetSets} onChange={e => setTargetSets(e.target.value)}
                    placeholder="3" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sec per set</label>
                  <input type="number" value={targetPerSet} onChange={e => setTargetPerSet(e.target.value)}
                    placeholder="30" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
            )}

            {selectedExercise?.targetType === 'weighted' && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sets</label>
                    <input type="number" value={targetSets} onChange={e => setTargetSets(e.target.value)}
                      placeholder="4" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reps per set</label>
                    <input type="number" value={targetPerSet} onChange={e => setTargetPerSet(e.target.value)}
                      placeholder="8" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Weight</label>
                    <input type="number" step="any" value={targetWeight} onChange={e => setTargetWeight(e.target.value)}
                      placeholder="60" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Unit</label>
                    <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
                      {(['kg', 'lbs'] as const).map(u => (
                        <button key={u} onClick={() => setWeightUnit(u)}
                          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${weightUnit === u ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                        >{u}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedExercise?.targetType === 'distance' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Distance</label>
                  <input type="number" step="any" value={targetDistance} onChange={e => setTargetDistance(e.target.value)}
                    placeholder="e.g. 400" className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Unit</label>
                  <div className="flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
                    {(['m', 'km', 'miles'] as const).map(u => (
                      <button key={u} onClick={() => setDistanceUnit(u)}
                        className={`flex-1 py-2.5 text-xs font-medium transition-colors ${distanceUnit === u ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                      >{u}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Challenge date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Challenge Date</label>
              <input type="date" value={challengeDate} onChange={e => setChallengeDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700/50 flex gap-3 flex-shrink-0">
          {step === 'configure' && (
            <button onClick={() => setStep('pick')}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Back
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-auto">
            Cancel
          </button>
          {step === 'configure' && (
            <button onClick={handleSend} disabled={sending}
              className="gradient-btn px-6 py-2.5 rounded-lg text-sm disabled:opacity-50">
              {sending ? 'Sending...' : 'Send Challenge'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
