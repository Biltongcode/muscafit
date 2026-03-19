'use client';

import { useState, useEffect } from 'react';

interface TokenStat {
  user_id: number;
  user_name: string;
  beers: number;
  poops: number;
}

export default function ChallengeTokens({ compact = false }: { compact?: boolean }) {
  const [stats, setStats] = useState<TokenStat[]>([]);

  useEffect(() => {
    fetch('/api/challenges/stats')
      .then(r => r.json())
      .then(d => setStats(d.stats || []))
      .catch(() => {});
  }, []);

  if (stats.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 text-xs">
        {stats.map(s => (
          <span key={s.user_id} className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
            <span className="font-medium text-gray-700 dark:text-slate-300">{s.user_name}</span>
            {s.beers > 0 && <span>&#x1F37A;{s.beers}</span>}
            {s.poops > 0 && <span>&#x1F4A9;{s.poops}</span>}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="glass gradient-border rounded-xl shadow-card p-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <span>&#x2694;&#xFE0F;</span> Challenge Tokens
      </h3>
      <div className="flex flex-wrap gap-4">
        {stats.map(s => (
          <div key={s.user_id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{s.user_name}</span>
            {s.beers > 0 && <span className="text-sm">&#x1F37A; {s.beers}</span>}
            {s.poops > 0 && <span className="text-sm">&#x1F4A9; {s.poops}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
