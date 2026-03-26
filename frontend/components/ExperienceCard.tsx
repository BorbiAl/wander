'use client';

import { useRouter } from 'next/navigation';
import { Experience } from '@/app/lib/data';
import { getHost, getVillage } from '@/app/lib/utils';

const TYPE_EMOJIS: Record<string, string> = {
  craft: '🔨', hike: '🥾', homestay: '🏡', ceremony: '🔥', cooking: '🍳', volunteer: '♻️', folklore: '🎭'
};

export function ExperienceCard({ exp }: { exp: Experience & { score: number } }) {
  const router = useRouter();
  const host = getHost(exp.hostId);
  const village = getVillage(exp.villageId);

  const matchPct = Math.round(exp.score * 100);
  const matchColor = matchPct > 70 ? 'text-accent' : matchPct > 40 ? 'text-amber' : 'text-text-2';

  return (
    <div 
      onClick={() => router.push(`/experience/${exp.id}`)}
      className="w-full bg-surface border border-[#222] rounded-card p-4 hover:border-[#333] transition-all cursor-pointer flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-2xl shrink-0">
        {TYPE_EMOJIS[exp.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <h4 className="font-medium text-[15px] text-white truncate">{exp.name}</h4>
          <span className="text-text-3 text-xs truncate">{village?.name}</span>
        </div>
        <div className="text-text-2 text-xs mt-0.5">
          {host?.name} · ⭐ {host?.rating}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-text-2 text-xs">€{exp.price} · {exp.duration}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-2 border border-[#333] text-text-2 capitalize">
            {exp.type}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <div className={`text-xl font-bold ${matchColor}`}>{matchPct}%</div>
        <div className="text-[10px] text-text-3 mb-2">Match</div>
        <button className="text-xs text-text-2 hover:text-white transition-colors">View →</button>
      </div>
    </div>
  );
}
