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
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">Muscafit</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base">
            Strength training accountability for Muscateers.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 sm:mb-10">
          <button
            onClick={() => router.push('/daily')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-blue-500/30 dark:hover:ring-blue-400/30 transition-all group touch-target"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Daily Tracker
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Check off exercises, log activities, and leave comments for each other.
            </p>
          </button>

          <button
            onClick={() => router.push('/weekly')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-blue-500/30 dark:hover:ring-blue-400/30 transition-all group touch-target"
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
            onClick={() => router.push('/strava')}
            className="glass rounded-2xl p-6 text-left hover:ring-2 hover:ring-orange-500/30 dark:hover:ring-orange-400/30 transition-all group touch-target"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                Strava
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              View recent Strava activities for both Muscateers in one feed.
            </p>
          </button>
        </div>

        {/* Quick Guide */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Guide
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>Check off exercises</strong> as you complete them each day. Tap the checkbox to mark done.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>Log activities</strong> like runs, walks, or gym sessions using the activity bar at the top of each user card.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>Leave comments</strong> to motivate (or berate) each other. Open the comment section at the bottom of each user card.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>Check the weekly view</strong> to see your full week and track consistency over time.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                <strong>Manage your exercises</strong> and set up email reminders from the menu in the top-right corner.
              </p>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
