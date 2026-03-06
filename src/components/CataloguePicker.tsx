'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { EXERCISE_CATALOGUE, CATALOGUE_CATEGORIES, type CatalogueExercise } from '@/lib/exercise-catalogue';

interface CataloguePickerProps {
  onSelect: (name: string, canonicalName: string, defaultTargetType: string) => void;
  onCustom: () => void;
  onCancel: () => void;
  /** Exercise names the user already has (to show a badge) */
  existingNames?: string[];
}

export default function CataloguePicker({ onSelect, onCustom, onCancel, existingNames = [] }: CataloguePickerProps) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search on mount (slight delay for mobile keyboards)
    const timer = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const existingLower = useMemo(
    () => new Set(existingNames.map(n => n.toLowerCase())),
    [existingNames]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return null; // show full category view
    const q = search.toLowerCase().trim();
    return EXERCISE_CATALOGUE.filter(e => e.name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = (exercise: CatalogueExercise) => {
    onSelect(exercise.name, exercise.name, exercise.defaultTargetType);
  };

  const renderExerciseRow = (exercise: CatalogueExercise) => {
    const alreadyAdded = existingLower.has(exercise.name.toLowerCase());
    return (
      <button
        key={exercise.name}
        onClick={() => handleSelect(exercise)}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
      >
        <span className="text-sm text-gray-900 dark:text-slate-100">{exercise.name}</span>
        {alreadyAdded && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
            Added
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="glass rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">Choose Exercise</h3>
        <button
          onClick={onCancel}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
        >
          Cancel
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
        />
      </div>

      {/* Exercise list */}
      <div className="max-h-80 overflow-y-auto">
        {filtered ? (
          // Search results (flat list)
          filtered.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {filtered.map(renderExerciseRow)}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">
              No exercises found for &ldquo;{search}&rdquo;
            </div>
          )
        ) : (
          // Category view
          CATALOGUE_CATEGORIES.map(category => {
            const exercises = EXERCISE_CATALOGUE.filter(e => e.category === category);
            return (
              <div key={category}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800/50 sticky top-0">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {category}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {exercises.map(renderExerciseRow)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create custom */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={onCustom}
          className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2"
        >
          + Create custom exercise
        </button>
      </div>
    </div>
  );
}
