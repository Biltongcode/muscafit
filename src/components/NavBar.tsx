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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Auto-detect active tab from pathname if not explicitly provided
  const currentTab = active ?? (
    pathname.startsWith('/weekly') ? 'weekly' :
    pathname.startsWith('/stats') ? 'stats' :
    pathname.startsWith('/strava') ? 'strava' :
    pathname.startsWith('/daily') ? 'daily' :
    pathname.startsWith('/settings') ? 'settings' :
    pathname === '/' ? 'home' : 'daily'
  );

  // Close desktop user menu on outside click
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

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { key: 'daily', label: 'Daily', path: '/daily', activeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    { key: 'weekly', label: 'Weekly', path: '/weekly', activeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    { key: 'stats', label: 'Stats', path: '/stats', activeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { key: 'strava', label: 'Strava', path: '/strava', activeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
    )},
  ];

  const settingsItems = [
    { label: 'My Exercises', path: '/settings/exercises' },
    { label: 'Profile', path: '/settings/profile' },
    { label: 'Notifications', path: '/settings/notifications' },
    { label: 'Goals', path: '/settings/goals' },
    { label: 'Strava', path: '/settings/strava' },
    { label: 'Connections', path: '/settings/connections' },
  ];

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="glass-strong shadow-sm sticky top-0 z-40" ref={mobileMenuRef}>
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity flex items-center">
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
        </button>

        {/* Desktop nav tabs - hidden on mobile */}
        <nav className="hidden md:flex gap-1 ml-6">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === item.key
                  ? item.activeColor
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle - visible on both mobile and desktop */}
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

          {/* Desktop user menu - hidden on mobile */}
          <div className="hidden md:block relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors touch-target"
            >
              <span className="text-sm text-gray-600 dark:text-slate-300">{currentUserName}</span>
              <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl shadow-lg dark:shadow-glow py-1 z-50 animate-scale-in">
                {settingsItems.map(item => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
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

          {/* Mobile hamburger button - hidden on desktop */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors touch-target flex items-center justify-center"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200/60 dark:border-slate-700/50 animate-scale-in">
          {/* Nav tabs */}
          <div className="grid grid-cols-4 gap-1 px-3 py-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition-colors ${
                  currentTab === item.key
                    ? item.activeColor
                    : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
                }`}
              >
                {item.icon || (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {item.key === 'daily' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
                    {item.key === 'weekly' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                  </svg>
                )}
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200/60 dark:border-slate-700/50" />

          {/* Settings links */}
          <div className="px-2 py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              {currentUserName}
            </div>
            {settingsItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left px-3 py-3 text-sm rounded-lg transition-colors ${
                  pathname === item.path
                    ? 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/15'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200/60 dark:border-slate-700/50" />

          {/* Sign out */}
          <div className="px-2 py-1 pb-2">
            <button
              onClick={() => signOut()}
              className="w-full text-left px-3 py-3 text-sm text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
