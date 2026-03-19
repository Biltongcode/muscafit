'use client';

import { useRouter } from 'next/navigation';
import NavBar from './NavBar';

interface HomeScreenProps {
  currentUserName: string;
}

export default function HomeScreen({ currentUserName }: HomeScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <NavBar currentUserName={currentUserName} />

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 320 80" className="h-16 sm:h-20 w-auto" aria-label="Muscafit">
              <defs>
                <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#6C8EFF'}}/>
                  <stop offset="100%" style={{stopColor:'#A855F7'}}/>
                </linearGradient>
                <filter id="heroGlow">
                  <feGaussianBlur stdDeviation="2" result="cb"/>
                  <feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#heroGrad)" opacity="0.15"/>
              <rect x="4" y="4" width="72" height="72" rx="18" fill="none" stroke="url(#heroGrad)" strokeWidth="1.5" opacity="0.6"/>
              <rect x="14" y="30" width="7" height="20" rx="3" fill="url(#heroGrad)" filter="url(#heroGlow)"/>
              <rect x="21" y="36" width="10" height="8" rx="2" fill="url(#heroGrad)"/>
              <rect x="31" y="38" width="18" height="4" rx="2" fill="url(#heroGrad)"/>
              <rect x="49" y="36" width="10" height="8" rx="2" fill="url(#heroGrad)"/>
              <rect x="59" y="30" width="7" height="20" rx="3" fill="url(#heroGrad)" filter="url(#heroGlow)"/>
              <text x="92" y="51" fontFamily="'DM Serif Display', Georgia, serif" fontSize="34" fontWeight="700" letterSpacing="-0.5" className="fill-gray-900 dark:fill-white">Muscafit</text>
              <line x1="92" y1="58" x2="308" y2="58" stroke="url(#heroGrad)" strokeWidth="1.5" opacity="0.35"/>
            </svg>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base">
            Stay on track together. Log exercises, track progress, keep each other accountable.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-10">
          <button
            onClick={() => router.push('/daily')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-cyan-500/30 dark:hover:ring-cyan-400/30 transition-all group touch-target"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Daily Tracker
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Check off exercises, log activities, and leave comments for each other.
            </p>
          </button>

          <button
            onClick={() => router.push('/weekly')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-cyan-500/30 dark:hover:ring-cyan-400/30 transition-all group touch-target"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Weekly Overview
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              See the full week at a glance with completion streaks and patterns.
            </p>
          </button>

          <button
            onClick={() => router.push('/stats')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-purple-500/30 dark:hover:ring-purple-400/30 transition-all group touch-target"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Stats & Goals
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Track totals, set goals, and see your progress over time.
            </p>
          </button>
        </div>

        {/* My Exercises shortcut */}
        <button
          onClick={() => router.push('/settings/exercises')}
          className="w-full glass rounded-2xl p-5 mb-8 sm:mb-10 text-left hover:ring-2 hover:ring-gray-300/50 dark:hover:ring-slate-500/30 transition-all group touch-target flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 dark:from-slate-500 dark:to-slate-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              My Exercises
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Add, edit, and schedule your exercises.
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-300 dark:text-slate-600 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* How it works */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it works
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                <strong>Set up your exercises</strong> &mdash; reps, sets, weighted, or timed. Schedule them to specific days if you like.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                <strong>Check them off daily</strong> &mdash; tick the box when done. Log runs, walks, or gym sessions too.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                <strong>Invite a friend</strong> &mdash; see each other&apos;s progress, leave comments, and stay motivated together.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                <strong>Track your progress</strong> &mdash; set goals, view stats, and review your week at a glance.
              </p>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
