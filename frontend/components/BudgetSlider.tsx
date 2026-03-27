'use client';

import { useState } from 'react';
import type { BudgetQuestion } from '@/app/lib/questionBank';

export function BudgetSlider({ 
  question,
  onChoice 
}: { 
  question: BudgetQuestion,
  onChoice: (index: 0|1|2) => void 
}) {
  const [choice, setChoice] = useState<0|1|2>(1);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);

  const options = [
    { label: question.low, desc: 'Low', textColor: '#16A34A' },
    { label: question.mid, desc: 'Medium', textColor: '#C56A14' },
    { label: question.high, desc: 'High', textColor: '#EF4444' },
  ];

  return (
    <div className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-5 sm:p-6 flex flex-col items-center">
      <div className="text-[#0B6E2A] text-[10px] font-bold tracking-widest uppercase mb-3">Spending Profile</div>
      <h2 className="font-sans font-bold text-center leading-tight text-[22px] sm:text-[24px] text-[#1A2E1C] mb-2">{question.question}</h2>
      <p className="font-sans text-xs sm:text-sm text-[#1A2E1C]/70 mb-2 text-center">This shapes the experiences we curate for you</p>
      <p className="font-sans text-[11px] sm:text-xs text-[#1A2E1C]/50 mb-6 text-center italic">{question.signal}</p>
      
      <div className="flex flex-col gap-3 w-full mb-6">
        {options.map((opt, i) => {
          const isColored = hoveredOption === i || choice === i;
          return (
            <div
              key={i}
              onClick={() => setChoice(i as 0|1|2)}
              onMouseEnter={() => setHoveredOption(i)}
              onMouseLeave={() => setHoveredOption(null)}
              className={`w-full border rounded-[20px] p-4 cursor-pointer transition-all relative overflow-hidden ${choice === i ? 'border-[#0B6E2A] bg-white ring-1 ring-[#0B6E2A]/30 shadow-sm' : 'border-[#D6DCCD]/60 bg-white/40 hover:border-[#0B6E2A]/50 hover:bg-white/60'}`}
            >
              {choice === i && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0B6E2A]" />
              )}
              <div className="font-semibold text-sm sm:text-base mb-1 transition-colors" style={{ color: isColored ? opt.textColor : '#1A2E1C' }}>{opt.label}</div>
              <div className="text-[11px] sm:text-xs tracking-wide uppercase transition-colors" style={{ color: isColored ? opt.textColor : 'rgba(26, 46, 28, 0.5)' }}>{opt.desc}</div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => onChoice(choice)}
        className="bg-[#0B6E2A] text-white font-semibold tracking-wide rounded-full px-6 py-3.5 hover:bg-[#095A22] active:scale-[0.98] transition-transform w-full shadow-md"
      >
        Complete Onboarding
      </button>
    </div>
  );
}
