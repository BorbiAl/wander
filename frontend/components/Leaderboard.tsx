'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/app/lib/store';

type LeaderboardEntry = {
  user_id: string;
  score: number;
  bookings: number;
  villages_count: number;
};

export function Leaderboard() {
  const { userId, points, bookings, villagesVisited } = useApp();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setEntries(data); })
      .catch(() => {});
  }, []);

  // Merge live leaderboard with current user's real data (upsert by user_id)
  const safePoints = Number(points) || 0;
  const meEntry: LeaderboardEntry = { user_id: userId, score: safePoints, bookings: bookings.length, villages_count: villagesVisited.length };
  const base = entries.length > 0 ? entries : (safePoints > 0 || bookings.length > 0 ? [meEntry] : []);
  const withMe = base.some(e => e.user_id === userId)
    ? base.map(e => e.user_id === userId ? meEntry : e)
    : safePoints > 0 || bookings.length > 0 ? [...base, meEntry] : base;
  const display = [...withMe].sort((a, b) => b.score - a.score).slice(0, 5);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1A2E1C]/50 mb-6">Global Leaderboard</div>
      <div className="flex flex-col gap-3 flex-1">
        {display.map((entry, i) => {
          const isMe = entry.user_id === userId;
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all ${
                isMe ? 'bg-[#0B6E2A]/5 border-2 border-[#0B6E2A]/20 shadow-sm' : 'bg-white/50 border border-[#D6DCCD]/40 hover:bg-white/80'
              }`}
            >
              <div className="text-xl w-7 text-center font-bold text-[#1A2E1C]/40">
                {medals[i] ?? (i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[15px] font-semibold tracking-tight truncate ${isMe ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]'}`}>
                  {isMe ? 'You' : entry.user_id}
                </div>
                <div className="text-[#1A2E1C]/50 text-xs font-medium mt-0.5">
                  {entry.bookings} booking{entry.bookings !== 1 ? 's' : ''} · {entry.villages_count} village{entry.villages_count !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right flex flex-col items-end justify-center">
                <div className={`text-xl font-bold tracking-tight ${isMe ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]'}`}>
                  {Number(entry.score) || 0}
                </div>
                <div className="text-[#1A2E1C]/40 font-semibold uppercase tracking-wider text-[9px] mt-0.5">pts</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-[#D6DCCD] text-center">
        <p className="text-[#1A2E1C]/40 font-medium tracking-tight text-[11px]">Less documented = more points</p>
      </div>
    </div>
  );
}
