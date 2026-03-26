'use client';

import { useRouter } from 'next/navigation';
import { GroupScoredExperience, PERSONALITY_INFO } from '@/app/lib/data';
import { getHost, getVillage } from '@/app/lib/utils';

const TYPE_EMOJIS: Record<string, string> = {
  craft: '🔨', hike: '🥾', homestay: '🏡', ceremony: '🔥', cooking: '🍳', volunteer: '♻️', folklore: '🎭',
};

type MemberEntry = {
  displayName: string;
  dominant: string;
};

export function GroupExperienceCard({
  exp,
  members,
}: {
  exp: GroupScoredExperience;
  members: MemberEntry[];
}) {
  const router = useRouter();
  const host = getHost(exp.hostId);
  const village = getVillage(exp.villageId);

  const groupPct = Math.round(exp.score * 100);

  function fitColor(score: number): string {
    if (score >= 0.6) return '#4ade80'; // green
    if (score >= 0.4) return '#fbbf24'; // amber
    return '#f87171';                   // red
  }

  return (
    <div
      onClick={() => router.push(`/experience/${exp.id}`)}
      className="w-full bg-surface border border-[#222] rounded-card p-4 hover:border-[#333] transition-all cursor-pointer flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-2xl shrink-0">
        {TYPE_EMOJIS[exp.type] ?? '🌍'}
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

        {/* Member fit bar */}
        {members.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-text-3 mr-1">Fits:</span>
            {members.map((member, i) => {
              const score = exp.memberScores[i] ?? exp.score;
              const color = fitColor(score);
              return (
                <div key={i} title={`${member.displayName}: ${Math.round(score * 100)}%`}>
                  <div
                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
                    style={{ background: `${color}33`, border: `1px solid ${color}` }}
                  >
                    <span style={{ color }}>
                      {PERSONALITY_INFO[member.dominant as keyof typeof PERSONALITY_INFO]?.emoji ?? '●'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end shrink-0">
        <div className="text-xl font-bold text-amber-400">{groupPct}%</div>
        <div className="text-[10px] text-text-3 mb-2">Group</div>
        <button className="text-xs text-text-2 hover:text-white transition-colors">View →</button>
      </div>
    </div>
  );
}
