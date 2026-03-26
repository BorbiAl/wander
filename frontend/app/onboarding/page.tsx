'use client'

import { useState } from 'react'
import Link from 'next/link'
import SwipeCard from '@/components/SwipeCard'
import PersonalityRadar from '@/components/PersonalityRadar'

// ── Content ────────────────────────────────────────────────────────────────

const SWIPE_CARDS = [
  { title: 'Ancient village homestay', desc: 'Sleep in a 200-year-old house with a local family.' },
  { title: 'Guided foraging walk', desc: 'Learn to pick wild herbs with a village elder.' },
  { title: 'Local cooking class', desc: 'Prepare traditional recipes from scratch.' },
  { title: 'Mountain sunrise hike', desc: '5 am start, panoramic views, total silence.' },
  { title: 'Artisan craft workshop', desc: 'Hands-on pottery or weaving with a master.' },
  { title: 'Community festival', desc: 'Join locals celebrating a centuries-old tradition.' },
]

const AUDIO_STEPS = [
  {
    question: 'Which soundscape draws you most?',
    options: ['Dawn birdsong in the forest', 'Rain on a stone roof', 'Village market chatter'],
  },
  {
    question: 'What would you rather hear on a slow afternoon?',
    options: ['Folk music from a nearby house', 'Silence and wind', 'Children playing outside'],
  },
  {
    question: 'Pick the sound that feels like home.',
    options: ['Crackling fireplace', 'Flowing mountain stream', 'Evening church bells'],
  },
]

const SCROLL_STEPS = [
  {
    question: 'How do you like to travel?',
    options: ['Solo', 'As a couple', 'Small group', 'Family'],
  },
  {
    question: 'What landscape calls to you?',
    options: ['Mountains', 'Coastline', 'Dense forest', 'Open plains'],
  },
  {
    question: 'Ideal trip length?',
    options: ['A weekend', 'One week', 'Two weeks', 'A month+'],
  },
]

const EMOJI_STEPS = [
  {
    question: 'You arrive at the village. What do you do first?',
    options: [
      { emoji: '🚶', label: 'Explore alone' },
      { emoji: '👋', label: 'Meet the locals' },
      { emoji: '📸', label: 'Document everything' },
      { emoji: '🍽️', label: 'Find food' },
    ],
  },
  {
    question: 'The plan changes at the last minute. You feel…',
    options: [
      { emoji: '🎉', label: 'Excited' },
      { emoji: '😌', label: 'Fine, I adapt' },
      { emoji: '😰', label: 'A bit anxious' },
      { emoji: '😤', label: 'Frustrated' },
    ],
  },
]

const AXES = ['Explorer', 'Connector', 'Restorer', 'Achiever', 'Guardian']

const TOTAL = 15

// ── Types ──────────────────────────────────────────────────────────────────

interface PersonalityResult {
  personality: {
    personality_vector: number[]
    dominant_type: string
    state_path: string[]
  }
  matches: unknown[]
}

type Phase = 'questions' | 'analysing' | 'result' | 'error'

// ── Page ───────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [observations, setObservations] = useState<number[]>([])
  const [budget, setBudget] = useState(60)
  const [phase, setPhase] = useState<Phase>('questions')
  const [result, setResult] = useState<PersonalityResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(obs: number[]) {
    setPhase('analysing')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations: obs }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // minimum 1.5s so the spinner is visible
      await new Promise(r => setTimeout(r, 1500))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wander:lastResult', JSON.stringify(data))
      }
      setResult(data)
      setPhase('result')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setPhase('error')
    }
  }

  function push(value: number) {
    const next = [...observations, value]
    setObservations(next)
    if (next.length < TOTAL) {
      setStep(s => s + 1)
    } else {
      submit(next)
    }
  }

  // ── Analysing screen ─────────────────────────────────────────────────────

  if (phase === 'analysing') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <div className="wg-shell w-full max-w-lg rounded-3xl p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-emerald-300 border-t-transparent animate-spin" />
          <p className="mt-6 text-2xl font-semibold text-emerald-50 animate-pulse">Analysing your profile...</p>
          <p className="mt-2 text-sm text-emerald-100/80">Decoding personality via HMM and ranking graph experiences.</p>
        </div>
      </main>
    )
  }

  // ── Result screen ────────────────────────────────────────────────────────

  if (phase === 'result' && result) {
    const pv = result.personality.personality_vector
    const dominantIndex = pv.indexOf(Math.max(...pv))
    const dominantType = AXES[dominantIndex] ?? result.personality.dominant_type
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <section className="wg-shell w-full max-w-2xl rounded-3xl p-8 text-center sm:p-10">
          <h2 className="text-3xl font-bold text-emerald-50">Your Travel Personality</h2>
          <div className="mx-auto mt-6 w-fit rounded-3xl bg-emerald-50 p-4">
            <PersonalityRadar personality_vector={pv} />
          </div>
          <p className="mt-5 text-2xl font-semibold text-emerald-200">{dominantType}</p>
          <p className="mt-2 text-sm text-emerald-100/75">Your profile has been synced and is ready for experience matching.</p>
          <Link
            href="/discover"
            className="mt-8 inline-block rounded-full bg-emerald-300 px-8 py-3 font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-200"
          >
            Discover your matches
          </Link>
        </section>
      </main>
    )
  }

  if (phase === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="wg-shell w-full max-w-lg rounded-3xl p-8 text-center">
          <p className="text-xl text-rose-200">Something went wrong</p>
          <p className="mt-2 text-sm text-emerald-100/80">{errorMsg}</p>
          <button
            onClick={() => { setPhase('questions'); setStep(0); setObservations([]) }}
            className="mt-6 rounded-full border border-emerald-200/50 px-6 py-2 text-sm text-emerald-50 transition hover:bg-emerald-200/10"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  // ── Questions screen ──────────────────────────────────────────────────────

  const progress = (step / TOTAL) * 100

  function renderStep() {
    if (step <= 5) {
      const card = SWIPE_CARDS[step]
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-emerald-100/85">Swipe right to include, left to skip</p>
          <SwipeCard key={step} onChoice={(dir) => push(dir === 'right' ? 1 : 0)}>
            <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{card.desc}</p>
          </SwipeCard>
        </div>
      )
    }

    if (step <= 8) {
      const audio = AUDIO_STEPS[step - 6]
      return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-center text-sm text-emerald-100/90">{audio.question}</p>
          {audio.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => push(i / (audio.options.length - 1))}
              className="wg-pill rounded-2xl px-5 py-4 text-left transition hover:bg-emerald-500/15"
            >
              <span className="text-2xl mr-3">🔊</span>
              <span className="text-sm font-medium">{opt}</span>
            </button>
          ))}
        </div>
      )
    }

    if (step <= 11) {
      const scroll = SCROLL_STEPS[step - 9]
      return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-center text-sm text-emerald-100/90">{scroll.question}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scroll.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => push(i / (scroll.options.length - 1))}
                className="wg-pill flex-shrink-0 rounded-2xl px-6 py-5 text-sm font-semibold transition hover:bg-emerald-500/15"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (step <= 13) {
      const scenario = EMOJI_STEPS[step - 12]
      return (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <p className="text-center text-sm text-emerald-100/90">{scenario.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {scenario.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => push(i / (scenario.options.length - 1))}
                className="wg-pill flex flex-col items-center gap-2 rounded-2xl py-5 transition hover:bg-emerald-500/15"
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <p className="text-center text-sm text-emerald-100/90">What's your daily budget?</p>
        <div className="text-center text-4xl font-bold text-emerald-50">EUR {budget}</div>
        <input
          type="range" min={20} max={200} step={5} value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-emerald-300"
          aria-label="Daily budget in euros"
          title="Daily budget"
        />
        <div className="flex justify-between text-xs text-emerald-100/70">
          <span>EUR 20</span><span>EUR 200</span>
        </div>
        <button
          type="button"
          onClick={() => push(budget / 200)}
          className="rounded-full bg-emerald-300 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-200"
        >
          Finish
        </button>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="wg-shell w-full max-w-2xl rounded-3xl p-6 sm:p-8">
        <div className="mx-auto w-full max-w-sm mb-8">
          <div className="mb-1 flex justify-between text-xs text-emerald-100/80">
          <span>Step {step + 1} of {TOTAL}</span>
          <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-emerald-950/40">
            <div
              className="h-1.5 rounded-full bg-emerald-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="mx-auto flex min-h-[420px] w-full max-w-md items-center justify-center">
          {renderStep()}
        </div>
      </section>
    </main>
  )
}
