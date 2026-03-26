'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type AmbientProfile =
  | 'forest'
  | 'festival'
  | 'wind'
  | 'campfire'
  | 'bells'
  | 'rain'
  | 'snow'
  | 'bees'
  | 'forge'
  | 'singing';

function inferProfile(text: string): AmbientProfile {
  const value = text.toLowerCase();
  if (value.includes('forest') || value.includes('bird')) return 'forest';
  if (value.includes('festival')) return 'festival';
  if (value.includes('wind') || value.includes('mountain')) return 'wind';
  if (value.includes('campfire') || value.includes('cricket')) return 'campfire';
  if (value.includes('church') || value.includes('bell')) return 'bells';
  if (value.includes('rain') || value.includes('thunder')) return 'rain';
  if (value.includes('snow') || value.includes('footsteps')) return 'snow';
  if (value.includes('bees') || value.includes('meadow')) return 'bees';
  if (value.includes('blacksmith') || value.includes('anvil')) return 'forge';
  return 'singing';
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function AudioReactor({ 
  clipTitle, clipDescription, sliderLabels, onChoice 
}: { 
  clipTitle: string,
  clipDescription: string,
  sliderLabels: [string, string, string],
  onChoice: (val: 0|1|2) => void
}) {
  const [val, setVal] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeLabel = val <= 2 ? sliderLabels[0] : val === 3 ? sliderLabels[1] : sliderLabels[2];
  const profile = useMemo(() => inferProfile(`${clipTitle} ${clipDescription}`), [clipDescription, clipTitle]);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopAmbient = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    setIsPlaying(false);
  };

  const startAmbient = () => {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 700;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    const base = ctx.createOscillator();
    base.type = 'sine';
    base.frequency.value = 140;
    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.012;
    base.connect(baseGain);
    baseGain.connect(master);

    if (profile === 'rain') {
      noiseFilter.frequency.value = 1400;
      noiseGain.gain.value = 0.03;
      base.frequency.value = 110;
    } else if (profile === 'wind') {
      noiseFilter.frequency.value = 500;
      noiseGain.gain.value = 0.025;
      base.frequency.value = 90;
    } else if (profile === 'bees') {
      noiseFilter.frequency.value = 900;
      base.type = 'sawtooth';
      base.frequency.value = 220;
      baseGain.gain.value = 0.01;
    } else if (profile === 'forest') {
      noiseFilter.frequency.value = 850;
      base.frequency.value = 170;
    } else if (profile === 'snow') {
      noiseFilter.frequency.value = 400;
      noiseGain.gain.value = 0.018;
      base.frequency.value = 80;
    }

    noise.start();
    base.start();

    timerRef.current = window.setInterval(() => {
      if (!ctxRef.current) return;
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = profile === 'bells' ? 'sine' : profile === 'forge' ? 'square' : 'triangle';
      ping.frequency.value =
        profile === 'festival' ? 280 :
        profile === 'singing' ? 240 :
        profile === 'bells' ? 520 :
        profile === 'forge' ? 180 : 340;
      pingGain.gain.value = profile === 'forge' ? 0.03 : 0.02;
      ping.connect(pingGain);
      pingGain.connect(master);
      ping.start();
      ping.stop(ctx.currentTime + (profile === 'singing' ? 0.5 : 0.12));
    }, profile === 'festival' ? 420 : profile === 'bells' ? 1800 : profile === 'forge' ? 900 : 1300);

    setIsPlaying(true);
  };

  useEffect(() => stopAmbient, []);
  useEffect(() => {
    if (isPlaying) {
      stopAmbient();
      startAmbient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleNext = () => {
    let choice: 0|1|2 = 1;
    if (val <= 2) choice = 0;
    else if (val > 3) choice = 2;
    onChoice(choice);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-[#F4EDE2] border border-[#D6DCCD] rounded-card p-6 flex flex-col items-center text-center">
      <div className="text-5xl mb-4">🎵</div>
      <h3 className="font-display text-xl text-[#1A2E1C] mb-2">{clipTitle}</h3>
      <p className="font-sans text-sm text-[#1A2E1C]/70 italic mb-6">{clipDescription}</p>
      
      <div className="w-full h-[1px] bg-[#D6DCCD] mb-6" />
      
      <p className="text-[#1A2E1C]/70 text-[13px] mb-4">How does this make you feel?</p>
      
      <div className="w-full mb-8 relative">
        <label htmlFor="audio-feeling-slider" className="sr-only">
          Feeling intensity from uneasy to at peace
        </label>
        <input 
          id="audio-feeling-slider"
          type="range" min="1" max="5" step="1" 
          value={val} onChange={(e) => setVal(parseInt(e.target.value))}
          title="Feeling intensity"
          className="w-full accent-[#0B6E2A] h-2 bg-[#D6DCCD] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[#1A2E1C]/65 mt-2">
          <span>{sliderLabels[0]}</span>
          <span>{sliderLabels[2]}</span>
        </div>
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-3xl font-bold text-[#0B6E2A] leading-none">{val}</span>
          <span className="text-[11px] text-[#1A2E1C]/70 mt-1">{activeLabel}</span>
        </div>
      </div>

      <button
        onClick={() => (isPlaying ? stopAmbient() : startAmbient())}
        className="border border-[#D6DCCD] text-[#1A2E1C]/70 rounded-pill px-6 py-3 hover:border-[#A8B09F] hover:text-[#1A2E1C] transition-colors mb-4 w-full text-sm"
      >
        {isPlaying ? '■ Stop ambience' : '▶ Play ambience'}
      </button>

      <button 
        onClick={handleNext}
        className="bg-[#0B6E2A] text-white font-medium rounded-pill px-6 py-3 hover:bg-[#095A22] active:scale-[0.97] transition-all w-full"
      >
        Next →
      </button>
    </div>
  );
}
