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

  const readingState = elapsed < 3 ? 0 : elapsed <= 8 ? 1 : 2;
  const readingLabels = ['Just glanced', 'Read it', 'Read it twice'];
  const progressPct = Math.min((elapsed / 9) * 100, 100);

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">

      {/* Header */}
      <div className="text-center flex flex-col gap-1">
        <p className="text-[#0B6E2A] text-[10px] font-bold tracking-widest uppercase">Read this experience</p>
        <h3 className="font-sans font-bold text-xl sm:text-2xl text-[#1A2E1C] leading-snug">{title}</h3>
      </div>

      {/* Story text */}
      <div className="max-h-[32vh] overflow-y-auto overscroll-contain rounded-2xl bg-white/50 border border-[#D6DCCD]/50 p-4">
        <p className="font-sans text-sm sm:text-[15px] text-[#1A2E1C]/80 leading-relaxed">{description}</p>
      </div>

      <div className="w-full h-px bg-[#D6DCCD]/60" />

      {/* Reading depth tracker */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-[#1A2E1C]/50 font-medium">
          <span>Reading depth</span>
          <span className="font-semibold text-[#0B6E2A]">{readingLabels[readingState]}</span>
        </div>
        <div className="w-full h-2 bg-[#D6DCCD]/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0B6E2A] rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between">
          {readingLabels.map((label, i) => (
            <span
              key={label}
              className={`text-[10px] font-semibold transition-colors ${
                readingState === i ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]/35'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="bg-[#0B6E2A] text-white font-semibold tracking-wide rounded-full px-6 py-3.5 hover:bg-[#095A22] active:scale-[0.98] transition-all w-full shadow-md"
      >
        Continue
      </button>
    </div>
  );
}
