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

  const options = [
    { label: question.low, desc: 'Low', color: '#34D399' },
    { label: question.mid, desc: 'Mid', color: '#C8F55A' },
    { label: question.high, desc: 'High', color: '#F5A623' },
  ];

  return (
    <div className="w-full max-w-sm mx-auto bg-[#F4EDE2] border border-[#D6DCCD] rounded-card p-6 flex flex-col items-center">
      <h2 className="font-display text-2xl text-[#1A2E1C] mb-2">{question.question}</h2>
      <p className="font-sans text-sm text-[#1A2E1C]/70 mb-2">This shapes which experiences we show you</p>
      <p className="font-sans text-xs text-[#1A2E1C]/65 mb-8 text-center">{question.signal}</p>
      
      <div className="flex flex-col gap-4 w-full mb-8">
        {options.map((opt, i) => (
          <div 
            key={i}
            onClick={() => setChoice(i as 0|1|2)}
            className={`w-full border rounded-card p-4 cursor-pointer transition-all relative overflow-hidden ${choice === i ? 'border-[#0B6E2A] bg-[#E2E7DA]' : 'border-[#D6DCCD] hover:border-[#A8B09F]'}`}
          >
            {choice === i && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0B6E2A]" />
            )}
            <div className="font-medium text-[#1A2E1C] mb-1">{opt.label}</div>
            <div className="text-xs text-[#1A2E1C]/70">{opt.desc}</div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => onChoice(choice)}
        className="bg-[#0B6E2A] text-white font-medium rounded-pill px-6 py-3 hover:bg-[#095A22] active:scale-[0.97] transition-all w-full text-lg"
      >
        Find my matches →
      </button>
    </div>
  );
}
