'use client';

import { motion } from 'motion/react';

export function EmojiScenario({ 
  scenario, onChoice 
}: { 
  scenario: string, onChoice: (index: 0|1|2|3|4|5) => void 
}) {
  const emojis = [
    { emoji: '😌', label: 'Peace', index: 0 },
    { emoji: '🤩', label: 'Wow', index: 1 },
    { emoji: '😐', label: 'Meh', index: 2 },
    { emoji: '💪', label: 'Challenge', index: 3 },
    { emoji: '🌿', label: 'Nature', index: 4 },
    { emoji: '🤝', label: 'Connect', index: 5 },
  ] as const;

  return (
    <div className="w-full max-w-sm mx-auto bg-surface border border-[#222] rounded-card p-6 flex flex-col items-center">
      <div className="text-text-3 text-[12px] mb-4">You&apos;re traveling. This happens:</div>
      <h3 className="font-display italic text-[22px] text-white text-center p-6">{scenario}</h3>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        {emojis.map((e) => (
          <motion.button
            key={e.index}
            whileHover={{ scale: 1.05 }}
            onClick={() => onChoice(e.index as any)}
            className="w-[70px] h-[70px] rounded-card border border-[#222] hover:border-accent bg-surface-2 flex flex-col items-center justify-center transition-colors"
          >
            <span className="text-2xl mb-1">{e.emoji}</span>
            <span className="text-[10px] text-text-2">{e.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
