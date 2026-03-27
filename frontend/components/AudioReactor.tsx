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
  clipTitle, clipDescription, clipSrc, sliderLabels, onChoice 
}: { 
  clipTitle: string,
  clipDescription: string,
  clipSrc?: string,
  sliderLabels: [string, string, string],
  onChoice: (val: 0|1|2) => void
}) {
  const [val, setVal] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeLabel = val <= 2 ? sliderLabels[0] : val === 3 ? sliderLabels[1] : sliderLabels[2];
  const profile = useMemo(() => inferProfile(`${clipTitle} ${clipDescription}`), [clipDescription, clipTitle]);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const stopAudioClip = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const startAudioClip = () => {
    if (!clipSrc) return;
    if (!audioRef.current) {
      const audio = new Audio(clipSrc);
      audio.preload = 'auto';
      audio.addEventListener('ended', () => setIsPlaying(false));
      audioRef.current = audio;
    }

    audioRef.current.currentTime = 0;
    void audioRef.current.play();
    setIsPlaying(true);
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

  useEffect(() => {
    return () => {
      stopAmbient();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (clipSrc) return;

    if (isPlaying) {
      stopAmbient();
      startAmbient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, clipSrc]);

  const togglePlayback = () => {
    if (isPlaying) {
      if (clipSrc) stopAudioClip();
      else stopAmbient();
      return;
    }

    if (clipSrc) startAudioClip();
    else startAmbient();
  };

  const handleNext = () => {
    let choice: 0|1|2 = 1;
    if (val <= 2) choice = 0;
    else if (val > 3) choice = 2;
    onChoice(choice);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-6 sm:p-8 flex flex-col items-center text-center gap-5">

      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-4xl sm:text-5xl">🎵</div>
        <h3 className="font-sans font-bold text-lg sm:text-xl text-[#1A2E1C] leading-snug">{clipTitle}</h3>
        <p className="font-sans text-xs sm:text-sm text-[#1A2E1C]/60 italic leading-relaxed">{clipDescription}</p>
      </div>

      <div className="w-full h-px bg-[#D6DCCD]/60" />

      {/* Play button */}
      <button
        onClick={togglePlayback}
        className="flex items-center justify-center gap-2.5 border border-[#D6DCCD] bg-white/70 text-[#1A2E1C]/80 rounded-full px-6 py-3 hover:bg-white hover:border-[#0B6E2A]/40 hover:text-[#1A2E1C] transition-all w-full text-sm font-medium shadow-sm"
      >
        {isPlaying ? (
          <>
            <div className="w-2.5 h-2.5 rounded-sm bg-[#1A2E1C]/80 shrink-0" />
            Stop audio
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Play audio
          </>
        )}
      </button>

      {/* Slider section */}
      <div className="w-full flex flex-col gap-3">
        <p className="text-[#1A2E1C]/80 font-medium text-sm">How does this make you feel?</p>

        {/* Active value pill */}
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 bg-[#0B6E2A]/10 text-[#0B6E2A] text-sm font-semibold px-4 py-1.5 rounded-full">
            <span className="text-base font-bold">{val}</span>
            <span className="font-medium">— {activeLabel}</span>
          </span>
        </div>

        <label htmlFor="audio-feeling-slider" className="sr-only">Feeling intensity</label>
        <input
          id="audio-feeling-slider"
          type="range" min="1" max="5" step="1"
          value={val} onChange={(e) => setVal(parseInt(e.target.value))}
          title="Feeling intensity"
          className="w-full accent-[#0B6E2A] h-2 bg-[#D6DCCD] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[#1A2E1C]/45">
          <span>{sliderLabels[0]}</span>
          <span>{sliderLabels[2]}</span>
        </div>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={handleNext}
        className="bg-[#0B6E2A] text-white font-semibold tracking-wide rounded-full px-6 py-3.5 hover:bg-[#095A22] active:scale-[0.98] transition-all w-full shadow-md"
      >
        Next step
      </button>
    </div>
  );
}
