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

  // Build display list: real leaderboard or synthetic with current user
  const safePoints = Number(points) || 0;
  const display: LeaderboardEntry[] = entries.length > 0 ? entries : [
    { user_id: userId, score: safePoints, bookings: bookings.length, villages_count: villagesVisited.length },
    { user_id: 'traveler_x9k', score: Math.max(0, safePoints - 40), bookings: Math.max(0, bookings.length - 1), villages_count: Math.max(0, villagesVisited.length - 1) },
    { user_id: 'wanderer_m2p', score: Math.max(0, safePoints - 90), bookings: Math.max(0, bookings.length - 2), villages_count: 0 },
  ].slice(0, 5);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-surface border border-[#222] rounded-card p-5">
      <div className="text-text-3 uppercase text-[11px] mb-4">Global Leaderboard</div>
      <div className="flex flex-col gap-3">
        {display.map((entry, i) => {
          const isMe = entry.user_id === userId;
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isMe ? 'bg-accent/10 border border-accent/20' : 'bg-surface-2'}`}
            >
              <span className="text-lg w-6 text-center">{medals[i] ?? `${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isMe ? 'text-accent' : 'text-white'}`}>
                  {isMe ? 'You' : entry.user_id}
                </div>
                <div className="text-text-3 text-[11px]">
                  {entry.bookings} booking{entry.bookings !== 1 ? 's' : ''} · {entry.villages_count} village{entry.villages_count !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-display text-lg font-bold ${isMe ? 'text-accent' : 'text-white'}`}>{Number(entry.score) || 0}</div>
                <div className="text-text-3 text-[10px]">pts</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-text-3 text-[11px] mt-4 text-center">Less documented = more points · Pioneer bonus active</p>
    </div>
  );
}
