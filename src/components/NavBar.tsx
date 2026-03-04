'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface NavBarProps {
  currentUserName: string;
  active?: 'daily' | 'weekly';
}

export default function NavBar({ currentUserName, active }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-detect active tab from pathname if not explicitly provided
  const currentTab = active ?? (pathname.startsWith('/weekly') ? 'weekly' : pathname.startsWith('/settings') ? 'settings' : 'daily');

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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-900">Muscafit</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => router.push('/')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'daily'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => router.push('/weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'weekly'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Weekly
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-600">{currentUserName}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
              <button
                onClick={() => { router.push('/settings/exercises'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                My Exercises
              </button>
              <button
                onClick={() => { router.push('/settings/profile'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Profile
              </button>
              <button
                onClick={() => { router.push('/settings/notifications'); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Notifications
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
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
