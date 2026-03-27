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
  const leftIsIp11 = leftSrc.endsWith('/assets/IP-11.jpg');
  const rightIsIp11 = rightSrc.endsWith('/assets/IP-11.jpg');

  const handleChoice = (side: 'left'|'right') => {
    setChosen(side);
    setTimeout(() => onChoice(side), 400);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <p className="text-[#1A2E1C]/70 text-sm mb-6">Which scene calls to you?</p>
      <div className="flex gap-4 w-full justify-center">
        <motion.div 
          whileHover={{ scale: 1.03 }}
          onClick={() => handleChoice('left')}
          className={`w-[190px] h-[320px] rounded-card border ${chosen === 'left' ? 'border-[#0B6E2A]' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-[#E5E9DF]/50 overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-full w-full" style={{ backgroundColor: leftColor }}>
            <img
              src={leftSrc}
              alt={leftDescription}
              className="h-full w-full object-cover"
              style={{
                objectPosition: leftIsIp11 ? 'top' : (leftImageObjectPosition ?? 'center'),
              }}
              loading="lazy"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 min-h-[96px] bg-[#E5E9DF]/95 backdrop-blur-sm border-t border-[#D6DCCD]/70 p-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-[#1A2E1C]">{leftLabel}</span>
            <span className="font-sans text-[11px] text-[#1A2E1C]/65 mt-2 leading-snug">{leftDescription}</span>
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
          className={`w-[190px] h-[320px] rounded-card border ${chosen === 'right' ? 'border-[#0B6E2A]' : 'border-[#D6DCCD] hover:border-[#0B6E2A]'} bg-[#E5E9DF]/50 overflow-hidden cursor-pointer relative transition-colors`}
        >
          <div className="h-full w-full" style={{ backgroundColor: rightColor }}>
            <img
              src={rightSrc}
              alt={rightDescription}
              className="h-full w-full object-cover"
              style={{
                objectPosition: rightIsIp11 ? 'top' : (rightImageObjectPosition ?? 'center'),
              }}
              loading="lazy"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 min-h-[96px] bg-[#E5E9DF]/95 backdrop-blur-sm border-t border-[#D6DCCD]/70 p-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-sm font-medium text-[#1A2E1C]">{rightLabel}</span>
            <span className="font-sans text-[11px] text-[#1A2E1C]/65 mt-2 leading-snug">{rightDescription}</span>
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
