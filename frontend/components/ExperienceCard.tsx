'use client';

import { useRouter } from 'next/navigation';
import { Experience } from '@/app/lib/data';
import { getHost, getVillage } from '@/app/lib/utils';
import { motion } from 'motion/react';

const TYPE_EMOJIS: Record<string, string> = {
  craft: '🔨', hike: '🥾', homestay: '🏡', ceremony: '🔥', cooking: '🍳', volunteer: '♻️', folklore: '🎭'
};

export function ExperienceCard({ exp }: { exp: Experience & { score: number } }) {
  const router = useRouter();
  const host = getHost(exp.hostId);
  const village = getVillage(exp.villageId);

  const matchPct = Math.round(exp.score * 100);
  const matchColor = matchPct > 70 ? 'text-[#0B6E2A]' : matchPct > 40 ? 'text-[#F5A623]' : 'text-[#1A2E1C]/50';

  return (
    <motion.div 
      whileHover={{ scale: 1.01, y: -2 }}
      onClick={() => router.push(`/experience/${exp.id}`)}
      className="w-full bg-white/60 backdrop-blur-xl border border-[#D6DCCD]/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-[24px] p-5 cursor-pointer flex items-center gap-5 transition-all"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#0B6E2A]/10 border border-[#0B6E2A]/20 flex items-center justify-center text-[28px] shrink-0 shadow-sm">
        {TYPE_EMOJIS[exp.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-[17px] text-[#1A2E1C] truncate tracking-tight">{exp.name}</h4>
          <span className="text-[#1A2E1C]/50 text-xs font-medium uppercase tracking-wider shrink-0 hidden sm:block">• {village?.name}</span>
        </div>
        <div className="text-[#1A2E1C]/60 text-[13px] font-medium tracking-tight mb-2">
          {host?.name} <span className="mx-1">•</span> <span className="text-[#F5A623]">★</span> {host?.rating}
        </div>
        <div className="flex items-center gap-2.5 mt-2">
          <span className="text-[#1A2E1C]/70 text-[13px] font-semibold bg-[#E5E9DF]/80 px-2.5 py-1 rounded-md">€{exp.price}</span>
          <span className="text-[#1A2E1C]/50 text-[12px] font-medium">{exp.duration}</span>
          <span className="ml-auto sm:ml-2 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-white border border-[#D6DCCD]/60 text-[#1A2E1C]/60 font-bold shadow-sm">
            {exp.type}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-center shrink-0 pl-3 border-l border-[#D6DCCD]/40 h-full py-1">
        <div className={`text-[22px] font-bold tracking-tighter ${matchColor}`}>{matchPct}%</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E1C]/40 mb-auto mt-0.5">Match</div>
        <div className="text-[12px] font-semibold text-[#0B6E2A] flex items-center gap-1 mt-2">
          View <span className="text-[14px]">→</span>
        </div>
      </div>
    </motion.div>
  );
}
