'use client';

import { useState } from 'react';

export function AudioReactor({ 
  clipTitle, clipDescription, onChoice 
}: { 
  clipTitle: string, clipDescription: string, onChoice: (val: 0|1|2) => void 
}) {
  const [val, setVal] = useState(3);

  const handleNext = () => {
    let choice: 0|1|2 = 1;
    if (val <= 2) choice = 0;
    else if (val > 3) choice = 2;
    onChoice(choice);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-surface border border-[#222] rounded-card p-6 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">🎵</div>
      <h3 className="font-display text-xl text-white mb-2">{clipTitle}</h3>
      <p className="font-sans text-sm text-text-2 italic mb-6">{clipDescription}</p>
      
      <div className="w-full h-[1px] bg-[#333] mb-6" />
      
      <p className="text-text-2 text-[13px] mb-4">How does this make you feel?</p>
      
      <div className="w-full mb-8 relative">
        <label htmlFor="audio-feeling-slider" className="sr-only">
          Feeling intensity from uneasy to at peace
        </label>
        <input 
          id="audio-feeling-slider"
          type="range" min="1" max="5" step="1" 
          value={val} onChange={(e) => setVal(parseInt(e.target.value))}
          title="Feeling intensity"
          className="w-full accent-accent h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-text-3 mt-2">
          <span>Uneasy</span>
          <span>At peace</span>
        </div>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl font-bold text-accent">
          {val}
        </div>
      </div>

      <button className="border border-[#333] text-text-2 rounded-pill px-6 py-3 hover:border-[#555] hover:text-text-1 transition-colors mb-4 w-full text-sm">
        ▶ Imagine this sound
      </button>

      <button 
        onClick={handleNext}
        className="bg-accent text-black font-medium rounded-pill px-6 py-3 hover:bg-accent-dim active:scale-[0.97] transition-all w-full"
      >
        Next →
      </button>
    </div>
  );
}
