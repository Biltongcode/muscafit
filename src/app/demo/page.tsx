'use client';

import { getActivityType, getActivityColorClasses } from '@/lib/activity-catalogue';

// --- Dummy Data ---

interface Exercise {
  logId: number;
  name: string;
  targetType: string;
  targetValue: number | null;
  targetSets: number | null;
  targetPerSet: number | null;
  exerciseNotes: string | null;
  targetWeight: number | null;
  weightUnit: string | null;
  completed: boolean;
  actualValue: number | null;
  actualSets: number | null;
  actualWeight: number | null;
}

interface Activity {
  id: number;
  activityType: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  notes: string | null;
  status: 'planned' | 'completed';
}

interface DemoUser {
  name: string;
  exercises: Exercise[];
  activities: Activity[];
  comments: { author: string; time: string; body: string }[];
  isRestDay?: boolean;
}

const users: DemoUser[] = [
  {
    name: 'Alex Mitchell',
    exercises: [
      { logId: 1, name: 'Push-ups', targetType: 'reps_sets', targetValue: 60, targetSets: 3, targetPerSet: 20, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: true, actualValue: 65, actualSets: 3, actualWeight: null },
      { logId: 2, name: 'Barbell Squats', targetType: 'weighted', targetValue: null, targetSets: 4, targetPerSet: 8, exerciseNotes: null, targetWeight: 80, weightUnit: 'kg', completed: true, actualValue: null, actualSets: 4, actualWeight: 85 },
      { logId: 3, name: 'Plank', targetType: 'timed', targetValue: 90, targetSets: null, targetPerSet: null, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: true, actualValue: 95, actualSets: null, actualWeight: null },
      { logId: 4, name: 'Pull-ups', targetType: 'reps_sets', targetValue: 24, targetSets: 3, targetPerSet: 8, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: false, actualValue: null, actualSets: null, actualWeight: null },
      { logId: 5, name: 'Dumbbell Lunges', targetType: 'weighted', targetValue: null, targetSets: 3, targetPerSet: 12, exerciseNotes: null, targetWeight: 20, weightUnit: 'kg', completed: false, actualValue: null, actualSets: null, actualWeight: null },
    ],
    activities: [
      { id: 1, activityType: 'run', durationMinutes: 35, distanceKm: 5.2, notes: 'Morning interval session', status: 'completed' },
      { id: 2, activityType: 'yoga', durationMinutes: 20, distanceKm: null, notes: null, status: 'completed' },
    ],
    comments: [
      { author: 'Sarah Chen', time: '08:15', body: 'Nice run! Those intervals are paying off' },
    ],
  },
  {
    name: 'Sarah Chen',
    exercises: [
      { logId: 10, name: 'Deadlifts', targetType: 'weighted', targetValue: null, targetSets: 4, targetPerSet: 6, exerciseNotes: null, targetWeight: 70, weightUnit: 'kg', completed: true, actualValue: null, actualSets: 4, actualWeight: 75 },
      { logId: 11, name: 'Box Jumps', targetType: 'reps_sets', targetValue: 30, targetSets: 3, targetPerSet: 10, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: true, actualValue: 30, actualSets: 3, actualWeight: null },
      { logId: 12, name: 'Kettlebell Swings', targetType: 'reps_sets', targetValue: 45, targetSets: 3, targetPerSet: 15, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: true, actualValue: 50, actualSets: 3, actualWeight: null },
      { logId: 13, name: 'Burpees', targetType: 'reps', targetValue: 20, targetSets: null, targetPerSet: null, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: true, actualValue: 25, actualSets: null, actualWeight: null },
    ],
    activities: [
      { id: 3, activityType: 'gym', durationMinutes: 55, distanceKm: null, notes: 'Leg day', status: 'completed' },
    ],
    comments: [
      { author: 'Alex Mitchell', time: '09:30', body: '4/4 — crushing it today!' },
      { author: 'James O\'Brien', time: '10:12', body: '75kg deadlifts, serious progress' },
    ],
  },
  {
    name: 'James O\'Brien',
    exercises: [
      { logId: 20, name: 'Bench Press', targetType: 'weighted', targetValue: null, targetSets: 4, targetPerSet: 8, exerciseNotes: null, targetWeight: 65, weightUnit: 'kg', completed: true, actualValue: null, actualSets: 4, actualWeight: 65 },
      { logId: 21, name: 'Incline Dumbbell Press', targetType: 'weighted', targetValue: null, targetSets: 3, targetPerSet: 10, exerciseNotes: null, targetWeight: 22, weightUnit: 'kg', completed: true, actualValue: null, actualSets: 3, actualWeight: 22 },
      { logId: 22, name: 'Tricep Dips', targetType: 'reps_sets', targetValue: 36, targetSets: 3, targetPerSet: 12, exerciseNotes: null, targetWeight: null, weightUnit: null, completed: false, actualValue: null, actualSets: null, actualWeight: null },
    ],
    activities: [
      { id: 4, activityType: 'squash', durationMinutes: 45, distanceKm: null, notes: null, status: 'completed' },
      { id: 5, activityType: 'swim', durationMinutes: 30, distanceKm: 1.5, notes: null, status: 'planned' },
    ],
    comments: [],
  },
  {
    name: 'Maya Patel',
    exercises: [],
    activities: [
      { id: 6, activityType: 'hike', durationMinutes: 90, distanceKm: 8.5, notes: 'Peak District trail', status: 'completed' },
    ],
    comments: [
      { author: 'Sarah Chen', time: '14:20', body: 'Enjoy the rest day! That hike looks amazing' },
    ],
    isRestDay: true,
  },
];

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
    default:
      return '';
  }
}

// --- Components ---

function DemoAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sizeMap = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };
  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center font-semibold text-white flex-shrink-0 ring-2 ring-white/20 dark:ring-slate-600/50`}>
      {initials}
    </div>
  );
}

function DemoExerciseRow({ exercise }: { exercise: Exercise }) {
  const isWeighted = exercise.targetType === 'weighted';
  return (
    <div className={`transition-colors ${exercise.completed ? 'bg-green-50/80 dark:bg-green-500/5' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
          exercise.completed
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 dark:border-green-400 text-white'
            : 'border-gray-300 dark:border-slate-600'
        }`}>
          {exercise.completed && (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${exercise.completed ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-slate-100'}`}>
            {exercise.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {formatTarget(exercise)}
            {exercise.actualValue != null && (
              <span className="ml-1 text-blue-600 dark:text-blue-400">
                (did: {exercise.actualValue}
                {exercise.actualSets != null ? ` in ${exercise.actualSets} sets` : ''}
                {isWeighted && exercise.actualWeight != null ? ` @ ${exercise.actualWeight}${exercise.weightUnit || 'kg'}` : ''})
              </span>
            )}
            {exercise.actualValue == null && isWeighted && exercise.actualWeight != null && exercise.completed && (
              <span className="ml-1 text-blue-600 dark:text-blue-400">
                (did: {exercise.actualSets} sets @ {exercise.actualWeight}{exercise.weightUnit || 'kg'})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoActivityCards({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
      <div className="space-y-2">
        {activities.map((activity) => {
          const actType = getActivityType(activity.activityType);
          const colors = getActivityColorClasses(actType.color);
          const isPlanned = activity.status === 'planned';
          return (
            <div
              key={activity.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isPlanned
                  ? `border-2 border-dashed ${colors.border} bg-white/50 dark:bg-slate-900/30`
                  : `border ${colors.bg} ${colors.border}`
              }`}
            >
              <span className={`text-lg flex-shrink-0 ${isPlanned ? 'opacity-60' : ''}`}>{actType.emoji}</span>
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
                  <span className={`font-medium ${colors.text}`}>{activity.durationMinutes}m</span>
                )}
                {activity.distanceKm != null && activity.distanceKm > 0 && (
                  <span className={`${colors.text} opacity-75`}>{activity.distanceKm} km</span>
                )}
                {activity.notes && (
                  <span className="text-gray-400 dark:text-slate-500 truncate max-w-[100px]">{activity.notes}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoComments({ comments }: { comments: { author: string; time: string; body: string }[] }) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700/50">
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map((c, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <DemoAvatar name={c.author} size="sm" />
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-300">{c.author}</span>
                <span className="text-gray-400 dark:text-slate-500 ml-1 text-xs">{c.time}</span>
                <p className="text-gray-600 dark:text-slate-400 mt-0.5 text-sm">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          placeholder="Leave a comment..."
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg focus:outline-none dark:placeholder-slate-500"
        />
        <button className="px-3 py-2.5 text-sm gradient-btn rounded-lg opacity-40 cursor-not-allowed">Send</button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function DemoPage() {
  const dateStr = 'Saturday, 8 March 2025';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Nav Bar */}
      <header className="glass-strong shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <svg viewBox="0 0 260 44" className="h-7 w-auto" aria-label="Muscafit">
              <defs>
                <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#6C8EFF'}}/>
                  <stop offset="100%" style={{stopColor:'#A855F7'}}/>
                </linearGradient>
              </defs>
              <rect x="0" y="12" width="4" height="20" rx="2" fill="url(#navGrad)"/>
              <rect x="4" y="17" width="6" height="10" rx="1.5" fill="url(#navGrad)"/>
              <rect x="10" y="20" width="10" height="4" rx="1.5" fill="url(#navGrad)"/>
              <rect x="20" y="17" width="6" height="10" rx="1.5" fill="url(#navGrad)"/>
              <rect x="26" y="12" width="4" height="20" rx="2" fill="url(#navGrad)"/>
              <text x="38" y="30" fontFamily="'DM Serif Display', Georgia, serif" fontSize="24" fontWeight="700" letterSpacing="-0.3" className="fill-gray-900 dark:fill-white">Muscafit</text>
            </svg>
            <nav className="hidden md:flex gap-1 ml-6">
              <span className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">Daily</span>
              <span className="px-4 py-2.5 text-sm font-medium rounded-lg text-gray-500 dark:text-slate-400">Weekly</span>
              <span className="px-4 py-2.5 text-sm font-medium rounded-lg text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Stats
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
              <svg className="w-5 h-5 text-gray-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <div className="hidden md:flex items-center gap-2 ml-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 cursor-pointer">
              <DemoAvatar name="Alex Mitchell" size="sm" />
              Alex
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button className="md:hidden p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50">
              <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Date Navigation */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-4 mb-6">
          <button className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{dateStr}</h2>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Today</span>
          </div>
          <button className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {users.map((user, idx) => {
            const completed = user.exercises.filter(e => e.completed).length;
            const total = user.exercises.length;
            const isOwn = idx === 0;

            return (
              <div key={user.name} className="glass rounded-xl shadow-sm dark:shadow-glow/5">
                {/* User header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <DemoAvatar name={user.name} size="lg" />
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                      {user.name}
                      {isOwn && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">(you)</span>}
                    </h3>
                  </div>
                  {total > 0 && (
                    <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                      completed === total
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                        : completed > 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-700/50 dark:text-slate-400'
                    }`}>
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
                    user.exercises.map(ex => <DemoExerciseRow key={ex.logId} exercise={ex} />)
                  )}
                </div>

                {/* Activities */}
                <DemoActivityCards activities={user.activities} />

                {/* Comments */}
                <DemoComments comments={user.comments} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm z-50">
        Demo view — sample data for portfolio
      </div>
    </div>
  );
}
