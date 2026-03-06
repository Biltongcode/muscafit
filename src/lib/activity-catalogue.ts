export interface ActivityType {
  key: string;
  label: string;
  emoji: string;
  /** Tailwind color name used for card backgrounds */
  color: string;
}

export const ACTIVITY_CATALOGUE: ActivityType[] = [
  // Racket Sports
  { key: 'squash', label: 'Squash', emoji: '🏸', color: 'orange' },
  { key: 'tennis', label: 'Tennis', emoji: '🎾', color: 'green' },
  { key: 'badminton', label: 'Badminton', emoji: '🏸', color: 'cyan' },
  { key: 'table_tennis', label: 'Table Tennis', emoji: '🏓', color: 'red' },

  // Cardio
  { key: 'run', label: 'Run', emoji: '🏃', color: 'blue' },
  { key: 'walk', label: 'Walk', emoji: '🚶', color: 'amber' },
  { key: 'cycle', label: 'Cycle', emoji: '🚴', color: 'green' },
  { key: 'swim', label: 'Swim', emoji: '🏊', color: 'cyan' },
  { key: 'hike', label: 'Hike', emoji: '🥾', color: 'emerald' },
  { key: 'rowing', label: 'Rowing', emoji: '🚣', color: 'blue' },
  { key: 'skipping', label: 'Skipping', emoji: '🪢', color: 'pink' },

  // Training
  { key: 'gym', label: 'Gym', emoji: '🏋️', color: 'purple' },
  { key: 'crossfit', label: 'CrossFit', emoji: '💪', color: 'red' },
  { key: 'hiit', label: 'HIIT', emoji: '⚡', color: 'amber' },
  { key: 'boxing', label: 'Boxing', emoji: '🥊', color: 'red' },
  { key: 'martial_arts', label: 'Martial Arts', emoji: '🥋', color: 'slate' },

  // Team Sports
  { key: 'football', label: 'Football', emoji: '⚽', color: 'emerald' },
  { key: 'basketball', label: 'Basketball', emoji: '🏀', color: 'orange' },
  { key: 'rugby', label: 'Rugby', emoji: '🏉', color: 'green' },
  { key: 'cricket', label: 'Cricket', emoji: '🏏', color: 'amber' },

  // Flexibility & Other
  { key: 'yoga', label: 'Yoga', emoji: '🧘', color: 'purple' },
  { key: 'pilates', label: 'Pilates', emoji: '🤸', color: 'pink' },
  { key: 'dance', label: 'Dance', emoji: '💃', color: 'pink' },
  { key: 'climbing', label: 'Climbing', emoji: '🧗', color: 'slate' },
];

const catalogueMap = new Map(ACTIVITY_CATALOGUE.map(a => [a.key, a]));

const DEFAULT_ACTIVITY: ActivityType = {
  key: 'custom',
  label: 'Activity',
  emoji: '🏅',
  color: 'gray',
};

/**
 * Get the activity type definition for a given key.
 * Returns the catalogue entry if known, otherwise a default with the key as label.
 */
export function getActivityType(key: string): ActivityType {
  const found = catalogueMap.get(key);
  if (found) return found;

  // Custom activity — use the key as a display label (title-cased)
  const label = key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return { ...DEFAULT_ACTIVITY, key, label };
}

/** Colour classes for activity cards based on colour name */
export function getActivityColorClasses(color: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-500/20' },
    green:   { bg: 'bg-green-50 dark:bg-green-500/10',   text: 'text-green-700 dark:text-green-300',   border: 'border-green-200 dark:border-green-500/20' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-500/20' },
    red:     { bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-200 dark:border-red-500/20' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-500/20' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-500/20' },
    cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-500/10',     text: 'text-cyan-700 dark:text-cyan-300',     border: 'border-cyan-200 dark:border-cyan-500/20' },
    pink:    { bg: 'bg-pink-50 dark:bg-pink-500/10',     text: 'text-pink-700 dark:text-pink-300',     border: 'border-pink-200 dark:border-pink-500/20' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/20' },
    slate:   { bg: 'bg-slate-100 dark:bg-slate-500/10',  text: 'text-slate-700 dark:text-slate-300',  border: 'border-slate-200 dark:border-slate-500/20' },
    gray:    { bg: 'bg-gray-50 dark:bg-gray-500/10',     text: 'text-gray-700 dark:text-gray-300',     border: 'border-gray-200 dark:border-gray-500/20' },
  };
  return map[color] || map.gray;
}
