'use client';

import { useState, useEffect } from 'react';

export function ScrollCard({ 
  title, description, onChoice 
}: { 
  title: string, description: string, onChoice: (reading: 0|1|2) => void 
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    let reading: 0|1|2 = 1;
    if (elapsed < 3) reading = 0;
    else if (elapsed > 8) reading = 2;
    onChoice(reading);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-surface border border-[#222] rounded-card p-6 flex flex-col">
      <div className="text-text-3 text-[11px] uppercase mb-4">Read this experience</div>
      <h3 className="font-display text-[22px] text-white mb-4">{title}</h3>
      <p className="font-sans text-base text-text-2 leading-relaxed mb-6">{description}</p>
      
      <div className="w-full h-[1px] bg-[#333] mb-6" />
      
      <div className="flex flex-col items-center mb-6">
        <span className="text-text-2 text-xs mb-2">Time spent reading</span>
        <span className="text-4xl font-bold text-accent mb-4">{elapsed}s</span>
        
        <div className="flex gap-2 w-full justify-between">
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed < 3 ? 'bg-accent/20 border-accent text-accent' : 'bg-surface-2 border-[#333] text-text-3'}`}>Just glanced</div>
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed >= 3 && elapsed <= 8 ? 'bg-accent/20 border-accent text-accent' : 'bg-surface-2 border-[#333] text-text-3'}`}>Read it</div>
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed > 8 ? 'bg-accent/20 border-accent text-accent' : 'bg-surface-2 border-[#333] text-text-3'}`}>Read it twice</div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="bg-accent text-black font-medium rounded-pill px-6 py-3 hover:bg-accent-dim active:scale-[0.97] transition-all w-full"
      >
        Continue →
      </button>
    </div>
  );
}
