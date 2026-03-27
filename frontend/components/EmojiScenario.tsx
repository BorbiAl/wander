'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { EmojiOption } from '@/app/lib/questionBank';

export function EmojiScenario({
  scenario, options, onChoice
}: {
  scenario: string,
  options: [EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption],
  onChoice: (index: 0|1|2|3|4|5) => void
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const handlePick = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setTimeout(() => onChoice(index as 0|1|2|3|4|5), 350);
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-8">

      {/* Scenario */}
      <p className="font-sans font-medium italic text-lg sm:text-xl leading-snug text-[#1A2E1C] text-center px-2">
        &ldquo;{scenario}&rdquo;
      </p>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isDimmed = selected !== null && !isSelected;

          return (
            <motion.button
              key={`${option.emoji}-${index}`}
              type="button"
              onClick={() => handlePick(index)}
              animate={{ opacity: isDimmed ? 0.3 : 1 }}
              transition={{ duration: 0.25 }}
              whileHover={selected === null ? { scale: 1.05 } : {}}
              whileTap={selected === null ? { scale: 0.95 } : {}}
              aria-label={option.label}
              className={`
                flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border
                transition-colors duration-200
                ${isSelected
                  ? 'bg-[#1A2E1C] border-[#1A2E1C]'
                  : 'bg-white/50 border-[#D6DCCD] hover:border-[#1A2E1C]/30 hover:bg-white/80'
                }
              `}
            >
              <span className="text-3xl leading-none select-none">{option.emoji}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-white' : 'text-[#1A2E1C]/50'}`}>
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
