'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { cwsColor } from '@/app/lib/utils';

export function CWSCounter({ 
  villageName, region, before, delta 
}: { 
  villageName: string, region: string, before: number, delta: number 
}) {
  const b = Number(before) || 50;
  const d = Number(delta) || 0;
  const after = b + d;
  const spring = useSpring(b, { bounce: 0, duration: 2000 });
  const displayValue = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(after);
  }, [after, spring]);

  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#D6DCCD] rounded-[24px] p-5 mb-4 shadow-sm">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="font-display font-semibold tracking-tight text-xl text-[#1A2E1C]">{villageName}</h3>
          <span className="text-[10px] font-semibold text-[#1A2E1C]/50 uppercase tracking-widest mt-1 block">{region}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <motion.span className="text-3xl font-bold tracking-tighter" style={{ color: cwsColor(after) }}>
            {displayValue}
          </motion.span>
          <span className="text-[#0B6E2A] text-sm font-semibold tracking-tight bg-[#0B6E2A]/10 px-2 py-0.5 rounded-full">+{d}</span>
        </div>
      </div>

      <div className="w-full h-3 bg-[#E5E9DF] rounded-full overflow-hidden relative shadow-inner">
        <div className="absolute top-0 left-0 bottom-0 bg-[#A5AB9D]" style={{ width: `${b}%` }} />
        <motion.div
          className="absolute top-0 bottom-0 bg-[#0B6E2A]"
          initial={{ left: `${b}%`, width: 0 }}
          animate={{ width: `${d}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
