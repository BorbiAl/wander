'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { SwipeCard } from '@/components/SwipeCard';
import { AudioReactor } from '@/components/AudioReactor';
import { ScrollCard } from '@/components/ScrollCard';
import { EmojiScenario } from '@/components/EmojiScenario';
import { BudgetSlider } from '@/components/BudgetSlider';

export default function OnboardingPage() {
  const router = useRouter();
  const { setObservations, setPersonality, setMatches } = useApp();
  const [step, setStep] = useState(0);
  const [obs, setObs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChoice = async (val: number) => {
    const newObs = [...obs, val];
    setObs(newObs);

    if (step < 14) {
      setStep(s => s + 1);
    } else {
      // Finish
      setLoading(true);
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observations: newObs })
        });
        const data = await res.json();
        setObservations(newObs);
        setPersonality(data.personality);
        setMatches(data.matches);
        setTimeout(() => router.push('/discover'), 1500);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-bg z-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#333] border-t-accent rounded-full animate-spin mb-6" />
        <p className="text-white font-display text-xl">Analyzing your personality...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-[#222]">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="text-text-2 hover:text-white">←</button>
          )}
          <span className="text-sm font-medium">WanderGraph</span>
        </div>
        <div className="text-text-3 text-xs">Step {step + 1} of 15</div>
      </div>
      <div className="w-full h-[2px] bg-[#222]">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${((step + 1) / 15) * 100}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {step === 0 && <SwipeCard leftLabel="Mountain wilderness" rightLabel="Village festival" leftColor="#1A2A1A" rightColor="#2A1A2A" onChoice={(s) => handleChoice(s === 'left' ? 0 : 1)} />}
            {step === 1 && <SwipeCard leftLabel="Lone hermitage" rightLabel="Busy market square" leftColor="#1A1A2A" rightColor="#2A1A1A" onChoice={(s) => handleChoice(s === 'left' ? 2 : 3)} />}
            {step === 2 && <SwipeCard leftLabel="Dense forest trail" rightLabel="Open meadow gathering" leftColor="#1A2A1A" rightColor="#2A2A1A" onChoice={(s) => handleChoice(s === 'left' ? 4 : 5)} />}
            {step === 3 && <SwipeCard leftLabel="Ancient ruins" rightLabel="Living ceremony" leftColor="#2A1A1A" rightColor="#1A2A2A" onChoice={(s) => handleChoice(s === 'left' ? 6 : 7)} />}
            {step === 4 && <SwipeCard leftLabel="Summit ridge" rightLabel="River valley hamlet" leftColor="#1A1A2A" rightColor="#1A2A1A" onChoice={(s) => handleChoice(s === 'left' ? 8 : 9)} />}
            {step === 5 && <SwipeCard leftLabel="Reforestation camp" rightLabel="Artisan workshop" leftColor="#1A2A1A" rightColor="#2A1A2A" onChoice={(s) => handleChoice(s === 'left' ? 10 : 11)} />}
            
            {step === 6 && <AudioReactor clipTitle="Forest stream at dawn" clipDescription="Soft water over stones. Birdsong. No human sound." onChoice={(v) => handleChoice(12 + (step - 6) * 3 + v)} />}
            {step === 7 && <AudioReactor clipTitle="Village festival drums" clipDescription="Rhythmic, communal energy. Voices joining in." onChoice={(v) => handleChoice(12 + (step - 6) * 3 + v)} />}
            {step === 8 && <AudioReactor clipTitle="Mountain wind" clipDescription="Vast silence broken by a single distant melody." onChoice={(v) => handleChoice(12 + (step - 6) * 3 + v)} />}
            
            {step === 9 && <ScrollCard title="Gaida Workshop, Shiroka Laka" description="Spend three days learning to make and play the gaida — Bulgarian bagpipe — with Dimitar Yordanov, a 9th-generation craftsman. You will leave with an instrument built by your own hands." onChoice={(v) => handleChoice(18 + (step - 9) * 3 + v)} />}
            {step === 10 && <ScrollCard title="Bear Territory Dawn Trek, Cherni Osam" description="Pre-dawn hike into brown bear habitat with Stoyan Markov, a park ranger of 22 years. He can identify 300 bird species by call. The Balkan wilderness before the world wakes." onChoice={(v) => handleChoice(18 + (step - 9) * 3 + v)} />}
            {step === 11 && <ScrollCard title="3 Nights in Bozhentsi" description="Stay in Ivanka Koleva's 200-year-old house. Wake to roosters. Help repair the stone fence. Eat dinner at a table that has seated six generations. No WiFi. No schedule." onChoice={(v) => handleChoice(18 + (step - 9) * 3 + v)} />}
            
            {step === 12 && <EmojiScenario scenario="Your guide cancels. You have a free day in a village where no one speaks your language." onChoice={(v) => handleChoice(21 + v % 3)} />}
            {step === 13 && <EmojiScenario scenario="You discover the village hosts a secret fire-walking ritual tonight. You weren't invited." onChoice={(v) => handleChoice(21 + v % 3)} />}
            
            {step === 14 && <BudgetSlider onChoice={(v) => handleChoice(21 + v)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
