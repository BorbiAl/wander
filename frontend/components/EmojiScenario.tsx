'use client';

import { motion } from 'motion/react';
import type { EmojiOption } from '@/app/lib/questionBank';

export function EmojiScenario({ 
  scenario, options, onChoice 
}: { 
  scenario: string,
  options: [EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption],
  onChoice: (index: 0|1|2|3|4|5) => void
}) {
  return (
    <div className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-5 sm:p-6 flex flex-col items-center">
      <div className="text-[#0B6E2A] text-[10px] font-bold tracking-widest uppercase mb-3">You&apos;re traveling. This happens:</div>
      <h3 className="font-sans font-medium italic text-lg sm:text-[22px] leading-snug text-[#1A2E1C] text-center p-4 sm:p-6">{scenario}</h3>
      
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-2 mb-2 w-full max-w-[260px]">
        {options.map((option, index) => (
          <motion.button
            key={`${option.emoji}-${index}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChoice(index as 0|1|2|3|4|5)}
            className="aspect-square rounded-[20px] border border-[#D6DCCD]/70 hover:border-[#0B6E2A] hover:bg-white bg-white/40 shadow-sm flex flex-col items-center justify-center transition-all"
            title={option.label}
            aria-label={option.label}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-sm">{option.emoji}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
