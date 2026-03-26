'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { cwsColor } from '@/app/lib/utils';

export function CWSCounter({ 
  villageName, region, before, delta 
}: { 
  villageName: string, region: string, before: number, delta: number 
}) {
  const after = before + delta;
  const spring = useSpring(before, { bounce: 0, duration: 2000 });
  const displayValue = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(after);
  }, [after, spring]);

  return (
    <div className="bg-surface border border-[#222] rounded-card p-5 mb-4">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="font-display text-lg text-white">{villageName}</h3>
          <span className="text-[10px] text-text-3 uppercase">{region}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <motion.span className="text-2xl font-bold" style={{ color: cwsColor(after) }}>
            {displayValue}
          </motion.span>
          <span className="text-accent text-sm font-medium">+{delta}</span>
        </div>
      </div>
      
      <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden relative">
        <div className="absolute top-0 left-0 bottom-0 bg-[#444]" style={{ width: `${before}%` }} />
        <motion.div 
          className="absolute top-0 bottom-0 bg-accent" 
          initial={{ left: `${before}%`, width: 0 }}
          animate={{ width: `${delta}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
