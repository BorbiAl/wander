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
    <div className="w-full max-w-md mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-card p-6 flex flex-col">
      <div className="text-[#1A2E1C]/65 text-[11px] uppercase mb-4">Read this experience</div>
      <h3 className="font-display text-[22px] text-[#1A2E1C] mb-4">{title}</h3>
      <div className="max-h-[40vh] overflow-y-auto pr-1 mb-6">
        <p className="font-sans text-base text-[#1A2E1C]/70 leading-relaxed">{description}</p>
      </div>
      
      <div className="w-full h-[1px] bg-[#D6DCCD] mb-6" />
      
      <div className="flex flex-col items-center mb-6">
        <span className="text-[#1A2E1C]/70 text-xs mb-2">Time spent reading</span>
        <span className="text-4xl font-bold text-[#0B6E2A] mb-4">{elapsed}s</span>
        
        <div className="flex gap-2 w-full justify-between">
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed < 3 ? 'bg-[#0B6E2A]/15 border-[#0B6E2A] text-[#0B6E2A]' : 'bg-[#E2E7DA] border-[#D6DCCD] text-[#1A2E1C]/65'}`}>Just glanced</div>
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed >= 3 && elapsed <= 8 ? 'bg-[#0B6E2A]/15 border-[#0B6E2A] text-[#0B6E2A]' : 'bg-[#E2E7DA] border-[#D6DCCD] text-[#1A2E1C]/65'}`}>Read it</div>
          <div className={`text-xs px-3 py-1 rounded-pill border ${elapsed > 8 ? 'bg-[#0B6E2A]/15 border-[#0B6E2A] text-[#0B6E2A]' : 'bg-[#E2E7DA] border-[#D6DCCD] text-[#1A2E1C]/65'}`}>Read it twice</div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="bg-[#0B6E2A] text-white font-medium rounded-pill px-6 py-3 hover:bg-[#095A22] active:scale-[0.97] transition-all w-full"
      >
        Continue →
      </button>
    </div>
  );
}
