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
  leftLabel, leftDescription, rightLabel, rightDescription, leftColor, rightColor, onChoice 
}: { 
  leftLabel: string,
  leftDescription: string,
  rightLabel: string,
  rightDescription: string,
  leftColor: string,
  rightColor: string,
  onChoice: (side: 'left'|'right') => void
}) {
  const [chosen, setChosen] = useState<'left'|'right'|null>(null);

  const handleChoice = (side: 'left'|'right') => {
    setChosen(side);
    setTimeout(() => onChoice(side), 400);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <p className="text-text-2 text-sm mb-6">Which scene calls to you?</p>
      <div className="flex gap-4 w-full justify-center">
        <motion.div 
          whileHover={{ scale: 1.03 }}
          onClick={() => handleChoice('left')}
          className={`w-[190px] h-[320px] rounded-card border ${chosen === 'left' ? 'border-accent' : 'border-[#222] hover:border-accent'} overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-[210px] w-full" style={{ backgroundColor: leftColor }}>
            <img
              src={imageAssetUrl(leftDescription)}
              alt={leftDescription}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="h-[110px] p-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-text-1">{leftLabel}</span>
            <span className="font-sans text-[11px] text-text-3 mt-2 leading-snug">{leftDescription}</span>
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
          className={`w-[190px] h-[320px] rounded-card border ${chosen === 'right' ? 'border-accent' : 'border-[#222] hover:border-accent'} overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-[210px] w-full" style={{ backgroundColor: rightColor }}>
            <img
              src={imageAssetUrl(rightDescription)}
              alt={rightDescription}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="h-[110px] p-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-text-1">{rightLabel}</span>
            <span className="font-sans text-[11px] text-text-3 mt-2 leading-snug">{rightDescription}</span>
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
