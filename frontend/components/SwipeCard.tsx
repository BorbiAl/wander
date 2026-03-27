'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

function imageAssetUrl(description: string): string {
  const query = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(',');
  return `https://loremflickr.com/1200/900/${encodeURIComponent(query)}`;
}

export function SwipeCard({ 
  leftLabel, leftDescription, rightLabel, rightDescription, leftImageSrc, rightImageSrc, leftImageObjectPosition, rightImageObjectPosition, leftColor, rightColor, onChoice 
}: { 
  leftLabel: string,
  leftDescription: string,
  rightLabel: string,
  rightDescription: string,
  leftImageSrc?: string,
  rightImageSrc?: string,
  leftImageObjectPosition?: string,
  rightImageObjectPosition?: string,
  leftColor: string,
  rightColor: string,
  onChoice: (side: 'left'|'right') => void
}) {
  const [chosen, setChosen] = useState<'left'|'right'|null>(null);
  const leftSrc = leftImageSrc ?? imageAssetUrl(leftDescription);
  const rightSrc = rightImageSrc ?? imageAssetUrl(rightDescription);

  const handleChoice = (side: 'left'|'right') => {
    setChosen(side);
    setTimeout(() => onChoice(side), 400);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
      <p className="mb-6 text-sm font-medium text-[#1A2E1C]/70">Which scene calls to you?</p>
      <div className="flex w-full justify-center gap-5">
        <motion.div 
          whileHover={{ scale: 1.03 }}
          onClick={() => handleChoice('left')}
          className={`relative flex h-[420px] w-[260px] cursor-pointer flex-col overflow-hidden rounded-[24px] border ${chosen === 'left' ? 'border-[#0B6E2A]' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-[#E5E9DF]/55 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-colors`}
        >
          <div className="h-[304px] w-full bg-gradient-to-b from-white/45 to-white/20" style={{ backgroundColor: leftColor }}>
            <img
              src={leftSrc}
              alt={leftDescription}
              className="h-full w-full object-cover"
              style={{
                objectPosition: leftImageObjectPosition ?? 'center',
              }}
              loading="lazy"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-3">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1A2E1C]/60">Option A</span>
          </div>
          <div className="z-10 flex min-h-[116px] flex-1 flex-col items-center justify-center border-t border-[#D6DCCD]/70 bg-[#E5E9DF]/95 px-4 py-3 text-center backdrop-blur-sm">
            <p className="w-full text-center font-sans text-sm font-semibold leading-tight text-[#1A2E1C]">{leftLabel}</p>
            <p className="mt-2 w-full text-center font-sans text-[11px] leading-snug text-[#1A2E1C]/65">{leftDescription}</p>
          </div>
          {chosen === 'left' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black">✓</div>
            </div>
          )}
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.03 }}
          onClick={() => handleChoice('right')}
          className={`relative flex h-[420px] w-[260px] cursor-pointer flex-col overflow-hidden rounded-[24px] border ${chosen === 'right' ? 'border-[#0B6E2A]' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-[#E5E9DF]/55 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-colors`}
        >
          <div className="h-[304px] w-full bg-gradient-to-b from-white/45 to-white/20" style={{ backgroundColor: rightColor }}>
            <img
              src={rightSrc}
              alt={rightDescription}
              className="h-full w-full object-cover"
              style={{
                objectPosition: rightImageObjectPosition ?? 'center',
              }}
              loading="lazy"
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-end px-3 pt-3">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1A2E1C]/60">Option B</span>
          </div>
          <div className="z-10 flex min-h-[116px] flex-1 flex-col items-center justify-center border-t border-[#D6DCCD]/70 bg-[#E5E9DF]/95 px-4 py-3 text-center backdrop-blur-sm">
            <p className="w-full text-center font-sans text-sm font-semibold leading-tight text-[#1A2E1C]">{rightLabel}</p>
            <p className="mt-2 w-full text-center font-sans text-[11px] leading-snug text-[#1A2E1C]/65">{rightDescription}</p>
          </div>
          {chosen === 'right' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black">✓</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
