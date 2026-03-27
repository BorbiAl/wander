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

const STAGE_META = [
  { group: 'Visual Pair', title: 'Choose your natural direction', detail: 'These choices reveal whether you seek novelty, people, challenge, calm, or impact.', hint: 'Pick the one that feels instantly right.' },
  { group: 'Visual Pair', title: 'Social energy vs solitude', detail: 'We estimate how much social contact you prefer during travel moments.', hint: 'No overthinking. Trust your gut.' },
  { group: 'Visual Pair', title: 'Impact vs adrenaline', detail: 'This helps balance purpose-driven and thrill-driven recommendations.', hint: 'Select what you would actually do first.' },
  { group: 'Visual Pair', title: 'Calm pace vs lively pace', detail: 'We learn your preferred emotional tempo in unfamiliar places.', hint: 'Choose your preferred mood.' },
  { group: 'Visual Pair', title: 'Discovery style', detail: 'Your response shapes how exploratory or structured your routes feel.', hint: 'Think about your ideal morning.' },
  { group: 'Visual Pair', title: 'Community signal', detail: 'This captures how strongly shared village life should appear in matches.', hint: 'Choose your honest preference.' },
  { group: 'Audio Mood', title: 'Soundscape reaction', detail: 'Your audio response maps to nervous-system comfort across different environments.', hint: 'Rate how your body reacts, not what sounds cool.' },
  { group: 'Audio Mood', title: 'Crowd acoustics profile', detail: 'We infer your tolerance for density, noise, and collective energy.', hint: 'Use the slider as your true emotional response.' },
  { group: 'Audio Mood', title: 'Wildness calibration', detail: 'This tunes how rugged and intense your recommendations should be.', hint: 'A small difference here changes ranking quality a lot.' },
  { group: 'Deep Read', title: 'Story engagement depth', detail: 'Reading behavior helps estimate how much context and interpretation you want.', hint: 'Read naturally, then continue.' },
  { group: 'Deep Read', title: 'Challenge narrative fit', detail: 'We detect whether you gravitate toward uncertainty, effort, and commitment.', hint: 'Respond based on your real travel mindset.' },
  { group: 'Deep Read', title: 'Ambiguity comfort', detail: 'This informs how open-ended your routes and activities should feel.', hint: 'Pick what feels authentic to you.' },
  { group: 'Reaction Set', title: 'Instant reaction profile', detail: 'Emoji responses sharpen your spontaneous social and practical tendencies.', hint: 'Choose quickly for best signal quality.' },
  { group: 'Reaction Set', title: 'Pressure response style', detail: 'This captures how you handle friction, surprises, and group dynamics.', hint: 'First instinct is usually the most accurate.' },
  { group: 'Budget Lens', title: 'Comfort and spending lens', detail: 'Budget preference helps align experience intensity and value expectations.', hint: 'Answer for your real trip behavior, not ideal behavior.' },
  { group: 'Volunteer Intent', title: 'Would you like to volunteer?', detail: 'If checked, we will highlight active volunteering events with dates and sign-up links in your results.', hint: 'Only check if you genuinely want to give back during this trip.' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();

  const { setObservations, setPersonality, setMatches, setVolunteerIntent, destination, seedStatus } = useApp();
  const [step, setStep] = useState(0);
  const [obs, setObs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [volunteerChecked, setVolunteerChecked] = useState(false);
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
  const totalSteps = STAGE_META.length;
  const progressPct = ((step + 1) / totalSteps) * 100;
  const currentMeta = STAGE_META[step] ?? STAGE_META[0];

  const handleChoice = (val: number) => {
    const newObs = [...obs, val];
    setObs(newObs);
    setStep(s => s + 1);
  };

  const handleFinishOnboarding = async () => {
    setLoading(true);
    try {
      setVolunteerIntent(volunteerChecked);
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations: obs })
      });
      const data = await res.json();
      setPersonality(data.personality);
      setObservations(obs);
      setMatches(data.matches);
      if (seedStatus === 'loading') {
        pendingNavigate.current = true;
      } else {
        router.push('/discover');
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#e5e9df]">
        <div className="mb-6 h-16 w-16 rounded-full border-4 border-[#D6DCCD] border-t-[#0B6E2A] animate-spin" />
        <p className="text-xl font-bold leading-tight tracking-tighter text-[#1A2E1C]">
          {seedStatus === 'loading' ? `Discovering villages in ${destination}…` : 'Analyzing your personality...'}
        </p>
        <p className="mt-2 text-sm text-[#1A2E1C]/55">Building your personalized route model</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-[#e5e9df] font-sans text-[#1A2E1C] selection:bg-[#0B6E2A]/20">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#0B6E2A]/10 bg-[#e5e9df]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex h-8 items-center justify-center rounded-full bg-white/50 px-3 text-sm font-medium text-[#1A2E1C] shadow-sm backdrop-blur-md transition-colors hover:bg-white"
            >
              ← Back
            </button>
          )}
          <span className="inline-block md:hidden text-sm font-semibold tracking-tight text-[#1A2E1C]">Wander Onboarding</span>
          {destination && (
            <span className="rounded-full bg-[#0B6E2A]/10 px-2.5 py-1 text-[10px] font-bold text-[#0B6E2A] uppercase tracking-wider">{destination}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden text-xs font-medium text-[#1A2E1C]/65">Step {step + 1} of {totalSteps}</div>
        </div>
      </div>

      <div className="h-[3px] w-full bg-[#D6DCCD]/40">
        <div className="h-full bg-[#0B6E2A] transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="relative flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 md:py-10 flex min-h-[500px]">
        {/* Subtle background gradients compatible with cozy vibe */}
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(11,110,42,0.06)_0%,rgba(229,233,223,0)_70%)]" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(245,166,35,0.08)_0%,rgba(229,233,223,0)_72%)]" />

        <div className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-8 md:gap-6 relative">

          {/* Desktop Left Sidebar */}
          <aside className="hidden md:block w-[300px] shrink-0 rounded-[28px] border border-white/60 bg-white/55 p-6 shadow-sm backdrop-blur-xl h-fit sticky top-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#1A2E1C]">{currentMeta.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#1A2E1C]/70">{currentMeta.detail}</p>

            <div className="mt-5 rounded-2xl border border-[#D6DCCD]/70 bg-[#E5E9DF]/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1A2E1C]/45">Detail</p>
              <p className="mt-1 text-sm text-[#1A2E1C]/70">{currentMeta.hint}</p>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#D6DCCD]/70 bg-white/70 px-4 py-3">
              <span className="text-xs font-medium text-[#1A2E1C]/55">Signals captured</span>
              <span className="text-xl font-bold tracking-tighter text-[#0B6E2A]">{obs.length}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {STAGE_META.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full ${idx < step ? 'bg-[#0B6E2A]' : idx === step ? 'bg-[#F5A623]' : 'bg-[#D6DCCD]'}`}
                />
              ))}
            </div>
          </aside>

          <div className="relative flex w-full max-w-lg lg:max-w-none mx-auto flex-col items-center justify-center">
            <div className="md:hidden mb-6 w-full text-center px-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B6E2A] mb-2">{currentMeta.group}</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A2E1C] leading-tight">{currentMeta.title}</h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#1A2E1C]/70">{currentMeta.detail}</p>
            </div>

          <section className="w-full flex-1 md:bg-white/30 md:border md:border-white/50 md:backdrop-blur-xl md:shadow-sm md:rounded-[32px] md:p-6 mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
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

                {step === 15 && (
                  <div className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-[24px] p-5 sm:p-6 flex flex-col items-center">
                    <div className="text-[#0B6E2A] text-[10px] font-bold tracking-widest uppercase mb-3">Volunteer Intent</div>
                    <h2 className="font-sans font-bold text-center leading-tight text-[22px] sm:text-[24px] text-[#1A2E1C] mb-2">Would you like to volunteer?</h2>
                    <p className="font-sans text-xs sm:text-sm text-[#1A2E1C]/70 mb-6 text-center">If yes, we will surface active volunteering events with dates and sign-up links at the top of your results.</p>
                    <label
                      className={`w-full flex items-center gap-4 border rounded-[20px] p-4 cursor-pointer transition-all mb-6 ${volunteerChecked ? 'border-[#0B6E2A] bg-white ring-1 ring-[#0B6E2A]/30 shadow-sm' : 'border-[#D6DCCD]/60 bg-white/40 hover:border-[#0B6E2A]/50 hover:bg-white/60'}`}
                    >
                      <input
                        type="checkbox"
                        checked={volunteerChecked}
                        onChange={e => setVolunteerChecked(e.target.checked)}
                        className="h-5 w-5 rounded accent-[#0B6E2A] cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-sm sm:text-base text-[#1A2E1C]">Yes, show me volunteering opportunities</div>
                        <div className="text-[11px] sm:text-xs text-[#1A2E1C]/50 mt-0.5">Active events with available spots will be highlighted</div>
                      </div>
                    </label>
                    <button
                      onClick={handleFinishOnboarding}
                      className="bg-[#0B6E2A] text-white font-semibold tracking-wide rounded-full px-6 py-3.5 hover:bg-[#095A22] active:scale-[0.98] transition-transform w-full shadow-md"
                    >
                      Complete Onboarding
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <div className="md:hidden w-full rounded-2xl bg-white/40 p-3 sm:p-4 text-center mt-4 border border-white/50 mb-2">
            <span className="text-xs sm:text-sm font-medium text-[#1A2E1C]/65">💡 Hint: {currentMeta.hint}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
