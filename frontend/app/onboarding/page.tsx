'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import SwipeCard from '../../components/SwipeCard'
import AudioReactor from '../../components/AudioReactor'
import PersonalityRadar from '../../components/PersonalityRadar'

// ---------------------------------------------------------------------------
// Emission indices (must match hmm/hmm/params.json "emissions" array)
// ---------------------------------------------------------------------------
const E = {
  img_wilderness: 0,
  img_popular: 1,
  img_group: 2,
  img_solo: 3,
  img_mountain: 4,
  img_village: 5,
  img_eco: 6,
  img_luxury: 7,
  img_adventure: 8,
  img_cultural: 9,
  img_nature: 10,
  img_urban: 11,
  audio_forest_high: 12,
  audio_forest_low: 13,
  audio_festival_high: 14,
  audio_festival_low: 15,
  audio_wind_high: 16,
  audio_wind_low: 17,
  scroll_skip: 18,
  scroll_read: 19,
  scroll_deep: 20,
  emoji_explore: 21,
  emoji_connect: 22,
  emoji_calm: 23,
  emoji_challenge: 24,
  emoji_impact: 25,
  budget_low: 26,
  budget_mid: 27,
  budget_high: 28,
}

// ---------------------------------------------------------------------------
// Step definitions — 15 micro-interactions
// ---------------------------------------------------------------------------
type Step =
  | { kind: 'swipe'; id: string; leftImage: string; rightImage: string; leftLabel: string; rightLabel: string; leftEmission: number; rightEmission: number }
  | { kind: 'audio'; id: string; src: string; label: string; emissionLow: number; emissionMid: number; emissionHigh: number }
  | { kind: 'scroll'; id: string; title: string; body: string }
  | { kind: 'emoji'; id: string; scenario: string; options: { emoji: string; label: string; emission: number }[] }
  | { kind: 'budget'; id: string }

const STEPS: Step[] = [
  // --- 6 image pair swipes ---
  {
    kind: 'swipe', id: 's1',
    leftImage: '/images/wilderness.jpg', leftLabel: 'Unmarked trail', leftEmission: E.img_wilderness,
    rightImage: '/images/popular.jpg', rightLabel: 'Busy viewpoint', rightEmission: E.img_popular,
  },
  {
    kind: 'swipe', id: 's2',
    leftImage: '/images/group.jpg', leftLabel: 'Group experience', leftEmission: E.img_group,
    rightImage: '/images/solo.jpg', rightLabel: 'Solo wandering', rightEmission: E.img_solo,
  },
  {
    kind: 'swipe', id: 's3',
    leftImage: '/images/mountain.jpg', leftLabel: 'Summit challenge', leftEmission: E.img_mountain,
    rightImage: '/images/village.jpg', rightLabel: 'Village life', rightEmission: E.img_village,
  },
  {
    kind: 'swipe', id: 's4',
    leftImage: '/images/eco.jpg', leftLabel: 'Eco project', leftEmission: E.img_eco,
    rightImage: '/images/luxury.jpg', rightLabel: 'Comfort stay', rightEmission: E.img_luxury,
  },
  {
    kind: 'swipe', id: 's5',
    leftImage: '/images/adventure.jpg', leftLabel: 'Wild adventure', leftEmission: E.img_adventure,
    rightImage: '/images/cultural.jpg', rightLabel: 'Cultural deep-dive', rightEmission: E.img_cultural,
  },
  {
    kind: 'swipe', id: 's6',
    leftImage: '/images/nature.jpg', leftLabel: 'Untouched nature', leftEmission: E.img_nature,
    rightImage: '/images/urban.jpg', rightLabel: 'Urban energy', rightEmission: E.img_urban,
  },
  // --- 3 audio clips ---
  {
    kind: 'audio', id: 'a1',
    src: '/audio/forest_stream.mp3', label: 'Forest stream at dawn',
    emissionLow: E.audio_forest_low, emissionMid: E.audio_forest_low, emissionHigh: E.audio_forest_high,
  },
  {
    kind: 'audio', id: 'a2',
    src: '/audio/village_festival.mp3', label: 'Village festival drums',
    emissionLow: E.audio_festival_low, emissionMid: E.audio_festival_low, emissionHigh: E.audio_festival_high,
  },
  {
    kind: 'audio', id: 'a3',
    src: '/audio/mountain_wind.mp3', label: 'Mountain wind and silence',
    emissionLow: E.audio_wind_low, emissionMid: E.audio_wind_low, emissionHigh: E.audio_wind_high,
  },
  // --- 3 scroll cards ---
  {
    kind: 'scroll', id: 'sc1',
    title: 'Strandzha Forest Survival',
    body: 'A full day deep in Bulgaria\'s last primary forest. Fire-making, track ID, water sourcing. No trail, no phone signal. Just you and the trees.',
  },
  {
    kind: 'scroll', id: 'sc2',
    title: 'Overnight with Baba Gena',
    body: 'Stay in a 200-year-old stone house with 78-year-old Gena. She cooks from the garden, tells stories until midnight, wakes you with fresh milk and honey.',
  },
  {
    kind: 'scroll', id: 'sc3',
    title: 'Clock Tower Restoration Day',
    body: 'Join the annual volunteer crew repairing Tryavna\'s 1814 clock tower. Mix lime plaster, repair stonework, eat lunch together. Free. No experience needed.',
  },
  // --- 2 scenario emoji reactions ---
  {
    kind: 'emoji', id: 'e1',
    scenario: 'Your guide cancels. You\'re in the village alone with a free afternoon.',
    options: [
      { emoji: '🗺️', label: 'Explore', emission: E.emoji_explore },
      { emoji: '🤝', label: 'Find locals', emission: E.emoji_connect },
      { emoji: '🌿', label: 'Rest', emission: E.emoji_calm },
      { emoji: '⛰️', label: 'Hike harder', emission: E.emoji_challenge },
      { emoji: '🌱', label: 'Volunteer', emission: E.emoji_impact },
    ],
  },
  {
    kind: 'emoji', id: 'e2',
    scenario: 'You arrive at a village with one day left. What matters most?',
    options: [
      { emoji: '🔭', label: 'Discover hidden spots', emission: E.emoji_explore },
      { emoji: '💬', label: 'Meet the people', emission: E.emoji_connect },
      { emoji: '☕', label: 'Slow down', emission: E.emoji_calm },
      { emoji: '🏆', label: 'Push limits', emission: E.emoji_challenge },
      { emoji: '💚', label: 'Leave a trace of good', emission: E.emoji_impact },
    ],
  },
  // --- 1 budget slider ---
  { kind: 'budget', id: 'b1' },
]

// ---------------------------------------------------------------------------
// Scroll card component — measures time-on-card
// ---------------------------------------------------------------------------
function ScrollCard({ title, body, onDone }: { title: string; body: string; onDone: (emission: number) => void }) {
  const startRef = useRef(Date.now())
  const [done, setDone] = useState(false)

  const submit = () => {
    if (done) return
    setDone(true)
    const elapsed = (Date.now() - startRef.current) / 1000
    const emission = elapsed < 2 ? E.scroll_skip : elapsed < 8 ? E.scroll_read : E.scroll_deep
    onDone(emission)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-80 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
      <button
        onClick={submit}
        disabled={done}
        className="mt-4 w-full rounded-lg bg-black text-white py-2 text-sm disabled:opacity-40"
      >
        {done ? 'Noted ✓' : 'Next →'}
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Budget slider
// ---------------------------------------------------------------------------
function BudgetSlider({ onDone }: { onDone: (emission: number) => void }) {
  const [val, setVal] = useState(2)
  const labels = ['< €30', '€30 – €80', '> €80']
  const done = useRef(false)

  const submit = () => {
    if (done.current) return
    done.current = true
    const emission = val === 1 ? E.budget_low : val === 2 ? E.budget_mid : E.budget_high
    onDone(emission)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-80 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold mb-1">Daily budget for experiences?</h3>
      <p className="text-3xl font-bold mt-4 mb-2 text-center">{labels[val - 1]}</p>
      <input
        type="range" min={1} max={3} value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-slate-400 mb-4">
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
      <button onClick={submit} className="w-full rounded-lg bg-black text-white py-2 text-sm">
        Confirm →
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main onboarding page
// ---------------------------------------------------------------------------
type OnboardingResult = {
  personality: {
    personality_vector: number[]
    dominant_type: string
    state_path: string[]
    confidence: number
  }
  matches: Array<{ id: string; score: number; name: string; village_id: string; type: string; price_eur: number }>
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = useState(0)
  const [observations, setObservations] = useState<number[]>([])
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStep = STEPS[stepIdx]
  const progress = stepIdx / STEPS.length

  const addObs = (emission: number) => {
    const next = [...observations, emission]
    setObservations(next)
    if (stepIdx + 1 >= STEPS.length) {
      submitObservations(next)
    } else {
      setStepIdx((i) => i + 1)
    }
  }

  const submitObservations = async (obs: number[]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observations: obs }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // --- Results screen ---
  if (result) {
    const pv = result.personality.personality_vector
    const dominant = result.personality.dominant_type
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-1">Your travel personality</h1>
          <p className="text-slate-500 capitalize text-lg">
            Dominant type: <span className="font-semibold text-black">{dominant}</span>
          </p>
        </motion.div>

        <PersonalityRadar values={pv} dominant={dominant} />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm"
        >
          <button
            onClick={() => router.push('/discover')}
            className="w-full rounded-xl bg-black text-white py-3 text-base font-medium"
          >
            Discover your matches →
          </button>
        </motion.div>
      </main>
    )
  }

  // --- Loading screen ---
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-black border-t-transparent rounded-full"
        />
        <p className="text-slate-500 text-sm">Decoding your personality…</p>
      </main>
    )
  }

  // --- Error screen ---
  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => { setError(null); setStepIdx(0); setObservations([]) }}
          className="rounded-lg border px-4 py-2 text-sm">
          Retry
        </button>
      </main>
    )
  }

  // --- Step screen ---
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      {/* Progress bar */}
      <div className="w-80">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Step {stepIdx + 1} of {STEPS.length}</span>
        </div>
        <div className="h-1.5 rounded bg-slate-200">
          <motion.div
            className="h-1.5 rounded bg-black"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep.kind === 'swipe' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-slate-500">Drag towards what calls you</p>
              <SwipeCard
                key={currentStep.id}
                leftImage={currentStep.leftImage}
                rightImage={currentStep.rightImage}
                leftLabel={currentStep.leftLabel}
                rightLabel={currentStep.rightLabel}
                leftEmission={currentStep.leftEmission}
                rightEmission={currentStep.rightEmission}
                onChoice={(emission) => addObs(emission)}
              />
            </div>
          )}

          {currentStep.kind === 'audio' && (
            <AudioReactor
              key={currentStep.id}
              src={currentStep.src}
              label={currentStep.label}
              emissionLow={currentStep.emissionLow}
              emissionMid={currentStep.emissionMid}
              emissionHigh={currentStep.emissionHigh}
              onChoice={(emission) => addObs(emission)}
            />
          )}

          {currentStep.kind === 'scroll' && (
            <ScrollCard
              key={currentStep.id}
              title={currentStep.title}
              body={currentStep.body}
              onDone={(emission) => addObs(emission)}
            />
          )}

          {currentStep.kind === 'emoji' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-80 rounded-2xl border bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium mb-4">{currentStep.scenario}</p>
              <div className="grid grid-cols-2 gap-2">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt.emission}
                    onClick={() => addObs(opt.emission)}
                    className="flex flex-col items-center gap-1 rounded-xl border p-3 text-sm hover:bg-slate-50 active:scale-95 transition-transform"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs text-slate-600">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep.kind === 'budget' && (
            <BudgetSlider onDone={(emission) => addObs(emission)} />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
