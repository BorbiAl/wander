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
    if (score >= 0.6) return '#0B6E2A';
    if (score >= 0.4) return '#B45309';
    return '#B91C1C';
  }

  return (
    <div
      onClick={() => router.push(`/experience/${exp.id}`)}
      className="w-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[28px] p-5 hover:bg-white hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-5"
    >
      <div className="w-[52px] h-[52px] rounded-[18px] bg-white border border-[#D6DCCD]/40 shadow-sm flex items-center justify-center text-2xl shrink-0">
        {TYPE_EMOJIS[exp.type] ?? '🌍'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <h4 className="font-medium text-[15px] text-[#1A2E1C] truncate">{exp.name}</h4>
          <span className="text-[#1A2E1C]/40 text-xs truncate">{village?.name}</span>
        </div>
        <div className="text-[#1A2E1C]/65 text-xs mt-0.5">
          {host?.name} · ⭐ {host?.rating}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[#1A2E1C]/65 text-xs">€{exp.price} · {exp.duration}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-pill bg-[#E5E9DF] border border-[#D6DCCD] text-[#1A2E1C]/65 capitalize">
            {exp.type}
          </span>
        </div>

        {/* Member fit bar */}
        {members.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[10px] text-[#1A2E1C]/40 mr-1">Fits:</span>
            {members.map((member, i) => {
              const score = exp.memberScores[i] ?? exp.score;
              const color = fitColor(score);
              return (
                <div key={i} title={`${member.displayName}: ${Math.round(score * 100)}%`}>
                  <div
                    className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px]"
                    style={{ background: `${color}18`, border: `1px solid ${color}55` }}
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
        <div className="text-xl font-bold text-amber-600">{groupPct}%</div>
        <div className="text-[10px] text-[#1A2E1C]/40 mb-2">Group</div>
        <button className="text-xs text-[#1A2E1C]/65 hover:text-[#1A2E1C] transition-colors">View →</button>
      </div>
    </div>
  );
}
