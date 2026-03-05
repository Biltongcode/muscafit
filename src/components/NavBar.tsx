'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/app/providers';

interface NavBarProps {
  currentUserName: string;
  active?: 'daily' | 'weekly' | 'stats' | 'strava';
}

export default function NavBar({ currentUserName, active }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-detect active tab from pathname if not explicitly provided
  const currentTab = active ?? (
    pathname.startsWith('/weekly') ? 'weekly' :
    pathname.startsWith('/stats') ? 'stats' :
    pathname.startsWith('/strava') ? 'strava' :
    pathname.startsWith('/daily') ? 'daily' :
    pathname.startsWith('/settings') ? 'settings' :
    pathname === '/' ? 'home' : 'daily'
  );

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="glass-strong shadow-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={() => router.push('/')} className="text-lg font-bold gradient-text hover:opacity-80 transition-opacity">
            Muscafit
          </button>
          <nav className="flex gap-1">
            <button
              onClick={() => router.push('/daily')}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors touch-target flex items-center ${
                currentTab === 'daily'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => router.push('/weekly')}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors touch-target flex items-center ${
                currentTab === 'weekly'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => router.push('/stats')}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors touch-target flex items-center gap-1.5 ${
                currentTab === 'stats'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Stats</span>
            </button>
            <button
              onClick={() => router.push('/strava')}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg transition-colors touch-target flex items-center gap-1.5 ${
                currentTab === 'strava'
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <span className="hidden sm:inline">Strava</span>
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 relative" ref={menuRef}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors touch-target flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors touch-target"
          >
            <span className="text-sm text-gray-600 dark:text-slate-300 hidden sm:inline">{currentUserName}</span>
            <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 sm:w-48 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl shadow-lg dark:shadow-glow py-1 z-50 animate-scale-in">
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700/50 sm:hidden">
                {currentUserName}
              </div>
              <button
                onClick={() => { router.push('/settings/exercises'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                My Exercises
              </button>
              <button
                onClick={() => { router.push('/settings/profile'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => { router.push('/settings/notifications'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Notifications
              </button>
              <button
                onClick={() => { router.push('/settings/goals'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Goals
              </button>
              <button
                onClick={() => { router.push('/settings/strava'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Strava
              </button>
              <div className="border-t border-gray-100 dark:border-slate-700/50 my-1" />
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-3 text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
