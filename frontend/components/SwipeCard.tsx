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
      <p className="mb-4 sm:mb-6 text-sm font-medium text-[#1A2E1C]/70">Which scene calls to you?</p>
      <div className="flex w-full flex-col sm:flex-row justify-center gap-4 sm:gap-5">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleChoice('left')}
          className={`relative flex flex-row sm:flex-col h-[160px] sm:h-[420px] w-full sm:w-[260px] cursor-pointer overflow-hidden rounded-[20px] sm:rounded-[24px] border ${chosen === 'left' ? 'border-[#0B6E2A] ring-2 ring-[#0B6E2A]/20' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-white/60 sm:bg-[#E5E9DF]/55 shadow-sm sm:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all`}
        >
          <div className="h-full sm:h-[304px] w-2/5 sm:w-full shrink-0" style={{ backgroundColor: leftColor }}>
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
          <div className="absolute left-2 top-2 sm:inset-x-0 sm:top-0 z-10 flex items-center sm:justify-between sm:px-3 sm:pt-3">
            <span className="rounded-full bg-white/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#1A2E1C]/70 shadow-sm">Option A</span>
          </div>
          <div className="z-10 flex flex-1 flex-col items-start sm:items-center justify-center border-l sm:border-l-0 sm:border-t border-[#D6DCCD]/50 bg-white/80 sm:bg-[#E5E9DF]/95 px-4 sm:py-3 text-left sm:text-center backdrop-blur-md">
            <p className="w-full font-sans text-sm sm:text-base font-semibold leading-tight text-[#1A2E1C]">{leftLabel}</p>
            <p className="mt-1 sm:mt-2 w-full font-sans text-xs sm:text-[11px] leading-relaxed text-[#1A2E1C]/70 line-clamp-3 sm:line-clamp-none">{leftDescription}</p>
          </div>
          {chosen === 'left' && (
            <div className="absolute inset-0 bg-[#0B6E2A]/10 flex items-center justify-center backdrop-blur-[1px]">
              <div className="w-12 h-12 rounded-full bg-[#0B6E2A] flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleChoice('right')}
          className={`relative flex flex-row-reverse sm:flex-col h-[160px] sm:h-[420px] w-full sm:w-[260px] cursor-pointer overflow-hidden rounded-[20px] sm:rounded-[24px] border ${chosen === 'right' ? 'border-[#0B6E2A] ring-2 ring-[#0B6E2A]/20' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-white/60 sm:bg-[#E5E9DF]/55 shadow-sm sm:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all`}
        >
          <div className="h-full sm:h-[304px] w-2/5 sm:w-full shrink-0" style={{ backgroundColor: rightColor }}>
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
          <div className="absolute right-2 top-2 sm:inset-x-0 sm:top-0 z-10 flex items-center justify-end sm:px-3 sm:pt-3">
            <span className="rounded-full bg-white/90 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#1A2E1C]/70 shadow-sm">Option B</span>
          </div>
          <div className="z-10 flex flex-1 flex-col items-start sm:items-center justify-center border-r sm:border-r-0 sm:border-t border-[#D6DCCD]/50 bg-white/80 sm:bg-[#E5E9DF]/95 px-4 sm:py-3 text-left sm:text-center backdrop-blur-md">
            <p className="w-full font-sans text-sm sm:text-base font-semibold leading-tight text-[#1A2E1C]">{rightLabel}</p>
            <p className="mt-1 sm:mt-2 w-full font-sans text-xs sm:text-[11px] leading-relaxed text-[#1A2E1C]/70 line-clamp-3 sm:line-clamp-none">{rightDescription}</p>
          </div>
          {chosen === 'right' && (
            <div className="absolute inset-0 bg-[#0B6E2A]/10 flex items-center justify-center backdrop-blur-[1px]">
              <div className="w-12 h-12 rounded-full bg-[#0B6E2A] flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
