'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/app/lib/store';
import { SwipeCard } from '@/components/SwipeCard';
import { AudioReactor } from '@/components/AudioReactor';
import { ScrollCard } from '@/components/ScrollCard';
import { EmojiScenario } from '@/components/EmojiScenario';
import { BudgetSlider } from '@/components/BudgetSlider';
import { generateQuestions } from '@/app/lib/questionBank';

export default function OnboardingPage() {
  const router = useRouter();

  const { setObservations, setPersonality, setMatches, destination, seedStatus } = useApp();
  const [step, setStep] = useState(0);
  const [obs, setObs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingNavigate = useRef(false);

  // When seedStatus finishes (done/idle), navigate if we were waiting for it
  useEffect(() => {
    if (pendingNavigate.current && seedStatus !== 'loading') {
      pendingNavigate.current = false;
      router.push('/discover');
    }
  }, [seedStatus, router]);

  // Generate a random set of questions once per session
  const questions = useMemo(() => generateQuestions(), []);

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
        // If seed is still running, let the useEffect navigate once it finishes
        if (seedStatus === 'loading') {
          pendingNavigate.current = true;
        } else {
          router.push('/discover');
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#E5E9DF] z-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#D6DCCD] border-t-[#0B6E2A] rounded-full animate-spin mb-6" />
        <p className="text-[#1A2E1C] font-bold tracking-tighter leading-tight text-xl">
          {seedStatus === 'loading' ? `Discovering villages in ${destination}…` : 'Analyzing your personality...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E9DF] text-[#1A2E1C] font-sans selection:bg-[#0B6E2A]/20 min-h-[calc(100vh-3.5rem)] flex flex-col font-sans">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-[#D6DCCD]">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="text-[#1A2E1C]/70 hover:text-[#1A2E1C]">←</button>
          )}
          <span className="text-sm font-medium text-[#1A2E1C]">WanderGraph</span>
          {destination && (
            <span className="text-[#1A2E1C]/65 text-xs">· {destination}</span>
          )}
        </div>
        <div className="text-[#1A2E1C]/65 text-xs">Step {step + 1} of 15</div>
      </div>
      <div className="w-full h-[2px] bg-[#D6DCCD]">
        <div className="h-full bg-[#0B6E2A] transition-all duration-300" style={{ width: `${((step + 1) / 15) * 100}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-[#E5E9DF]">
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

            {step === 9 && <ScrollCard {...questions.scrollCards[0]} onChoice={(v) => handleChoice(18 + v)} />}
            {step === 10 && <ScrollCard {...questions.scrollCards[1]} onChoice={(v) => handleChoice(18 + v)} />}
            {step === 11 && <ScrollCard {...questions.scrollCards[2]} onChoice={(v) => handleChoice(18 + v)} />}

            {step === 12 && <EmojiScenario scenario={questions.emojis[0].scenario} options={questions.emojis[0].options} onChoice={(v) => handleChoice(21 + v % 3)} />}
            {step === 13 && <EmojiScenario scenario={questions.emojis[1].scenario} options={questions.emojis[1].options} onChoice={(v) => handleChoice(21 + v % 3)} />}

            {step === 14 && <BudgetSlider question={questions.budget} onChoice={(v) => handleChoice(21 + v)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
