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
    const reading: 0|1|2 = elapsed < 4 ? 0 : elapsed < 10 ? 1 : 2;
    onChoice(reading);
  };

  const readingState = elapsed < 4 ? 0 : elapsed < 10 ? 1 : 2;

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

      <div className="flex items-center justify-between">
        {(['Glanced', 'Read', 'Read Twice'] as const).map((label, i) => (
          <span
            key={label}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-500 ${
              readingState === i
                ? 'border-[#0B6E2A] text-[#0B6E2A] shadow-[0_0_8px_rgba(11,110,42,0.4)]'
                : 'border-[#D6DCCD] text-[#1A2E1C]/30'
            }`}
          >
            {label}
          </span>
        ))}
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
