'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { EXPERIENCES, VILLAGES } from '@/app/lib/data';
import { SwipeCard } from '@/components/SwipeCard';
import { AudioReactor } from '@/components/AudioReactor';
import { ScrollCard } from '@/components/ScrollCard';
import { EmojiScenario } from '@/components/EmojiScenario';
import { BudgetSlider } from '@/components/BudgetSlider';
import { generateQuestions } from '@/app/lib/questionBank';

export default function OnboardingPage() {
  const router = useRouter();
  const { setObservations, setPersonality, setMatches, destination } = useApp();
  const [step, setStep] = useState(0);
  const [obs, setObs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate a random set of questions once per session
  const questions = useMemo(() => generateQuestions(), []);

  // Pick 3 real experiences from seeded data for scroll cards
  const scrollCardExps = useMemo(() => {
    const exps = EXPERIENCES.slice(0, 3);
    return exps.map(e => {
      const village = VILLAGES.find(v => v.id === e.villageId);
      return {
        title: `${e.name}${village ? `, ${village.name}` : ''}`,
        description: e.description,
      };
    });
  }, []);

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
          {destination && (
            <span className="text-text-3 text-xs">· {destination}</span>
          )}
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
            {step === 0 && <SwipeCard {...questions.swipes[0]} onChoice={(s) => handleChoice(s === 'left' ? 0 : 1)} />}
            {step === 1 && <SwipeCard {...questions.swipes[1]} onChoice={(s) => handleChoice(s === 'left' ? 2 : 3)} />}
            {step === 2 && <SwipeCard {...questions.swipes[2]} onChoice={(s) => handleChoice(s === 'left' ? 4 : 5)} />}
            {step === 3 && <SwipeCard {...questions.swipes[3]} onChoice={(s) => handleChoice(s === 'left' ? 6 : 7)} />}
            {step === 4 && <SwipeCard {...questions.swipes[4]} onChoice={(s) => handleChoice(s === 'left' ? 8 : 9)} />}
            {step === 5 && <SwipeCard {...questions.swipes[5]} onChoice={(s) => handleChoice(s === 'left' ? 10 : 11)} />}

            {step === 6 && <AudioReactor {...questions.audios[0]} onChoice={(v) => handleChoice(12 + v)} />}
            {step === 7 && <AudioReactor {...questions.audios[1]} onChoice={(v) => handleChoice(15 + v)} />}
            {step === 8 && <AudioReactor {...questions.audios[2]} onChoice={(v) => handleChoice(18 + v)} />}

            {step === 9 && <ScrollCard title={scrollCardExps[0]?.title ?? 'A local craft workshop'} description={scrollCardExps[0]?.description ?? 'Work alongside a master craftsperson and leave with something made by your own hands.'} onChoice={(v) => handleChoice(18 + v)} />}
            {step === 10 && <ScrollCard title={scrollCardExps[1]?.title ?? 'Dawn nature walk'} description={scrollCardExps[1]?.description ?? 'Pre-dawn hike into untouched wilderness with a local guide who knows every trail by memory.'} onChoice={(v) => handleChoice(18 + v)} />}
            {step === 11 && <ScrollCard title={scrollCardExps[2]?.title ?? 'Village homestay'} description={scrollCardExps[2]?.description ?? 'Stay in a centuries-old house. Wake to roosters. Eat dinner at a table that has seated generations. No WiFi. No schedule.'} onChoice={(v) => handleChoice(18 + v)} />}

            {step === 12 && <EmojiScenario scenario={questions.emojis[0].scenario} onChoice={(v) => handleChoice(21 + v % 3)} />}
            {step === 13 && <EmojiScenario scenario={questions.emojis[1].scenario} onChoice={(v) => handleChoice(21 + v % 3)} />}

            {step === 14 && <BudgetSlider onChoice={(v) => handleChoice(21 + v)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
