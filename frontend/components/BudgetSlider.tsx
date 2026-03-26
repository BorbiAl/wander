'use client';

import { useState } from 'react';

export function BudgetSlider({ 
  onChoice 
}: { 
  onChoice: (index: 0|1|2) => void 
}) {
  const [choice, setChoice] = useState<0|1|2>(1);

  const options = [
    { label: '< €30 / day', desc: 'Volunteer stays, community hosting', color: '#34D399' },
    { label: '€30–80 / day', desc: 'Workshops, guided experiences', color: '#C8F55A' },
    { label: '> €80 / day', desc: 'Premium immersions, private guides', color: '#F5A623' },
  ];

  return (
    <div className="w-full max-w-sm mx-auto bg-surface border border-[#222] rounded-card p-6 flex flex-col items-center">
      <h2 className="font-display text-2xl text-white mb-2">Your daily travel budget</h2>
      <p className="font-sans text-sm text-text-2 mb-8">This shapes which experiences we show you</p>
      
      <div className="flex flex-col gap-4 w-full mb-8">
        {options.map((opt, i) => (
          <div 
            key={i}
            onClick={() => setChoice(i as 0|1|2)}
            className={`w-full border rounded-card p-4 cursor-pointer transition-all relative overflow-hidden ${choice === i ? 'border-accent bg-surface-2' : 'border-[#222] hover:border-[#333]'}`}
          >
            {choice === i && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
            )}
            <div className="font-medium text-white mb-1" style={{ color: choice === i ? opt.color : 'white' }}>{opt.label}</div>
            <div className="text-xs text-text-2">{opt.desc}</div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => onChoice(choice)}
        className="bg-accent text-black font-medium rounded-pill px-6 py-3 hover:bg-accent-dim active:scale-[0.97] transition-all w-full text-lg"
      >
        Find my matches →
      </button>
    </div>
  );
}
