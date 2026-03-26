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
    <div className="w-full max-w-sm mx-auto bg-surface border border-[#222] rounded-card p-6 flex flex-col items-center">
      <div className="text-text-3 text-[12px] mb-4">You&apos;re traveling. This happens:</div>
      <h3 className="font-display italic text-[22px] text-white text-center p-6">{scenario}</h3>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        {options.map((option, index) => (
          <motion.button
            key={`${option.emoji}-${index}`}
            whileHover={{ scale: 1.05 }}
            onClick={() => onChoice(index as 0|1|2|3|4|5)}
            className="w-[70px] h-[70px] rounded-card border border-[#222] hover:border-accent bg-surface-2 flex flex-col items-center justify-center transition-colors"
            title={option.label}
            aria-label={option.label}
          >
            <span className="text-2xl">{option.emoji}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
