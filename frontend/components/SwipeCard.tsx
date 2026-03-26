'use client';

import { motion, useMotionValue, useTransform } from 'motion/react';
import { useState } from 'react';

export function SwipeCard({ 
  leftLabel, rightLabel, leftColor, rightColor, onChoice 
}: { 
  leftLabel: string, rightLabel: string, leftColor: string, rightColor: string, onChoice: (side: 'left'|'right') => void 
}) {
  const [chosen, setChosen] = useState<'left'|'right'|null>(null);

  const handleChoice = (side: 'left'|'right') => {
    setChosen(side);
    setTimeout(() => onChoice(side), 400);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <p className="text-text-2 text-sm mb-6">Which calls to you?</p>
      <div className="flex gap-4 w-full justify-center">
        <motion.div 
          whileHover={{ scale: 1.03 }}
          onClick={() => handleChoice('left')}
          className={`w-[160px] h-[210px] rounded-card border ${chosen === 'left' ? 'border-accent' : 'border-[#222] hover:border-accent'} overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-[140px] w-full" style={{ backgroundColor: leftColor }} />
          <div className="h-[70px] p-3 flex items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-text-1">{leftLabel}</span>
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
          className={`w-[160px] h-[210px] rounded-card border ${chosen === 'right' ? 'border-accent' : 'border-[#222] hover:border-accent'} overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-[140px] w-full" style={{ backgroundColor: rightColor }} />
          <div className="h-[70px] p-3 flex items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-text-1">{rightLabel}</span>
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
