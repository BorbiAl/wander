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

// ── Types ──────────────────────────────────────────────────────────────────

interface Result {
  personality: string
  personality_vector: number[]
  matches: unknown[]
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [observations, setObservations] = useState<number[]>([])
  const [budget, setBudget] = useState(60)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const TOTAL = 15

  function push(value: number) {
    const next = [...observations, value]
    setObservations(next)

    if (step < TOTAL - 1) {
      setStep(step + 1)
    } else {
      submit(next)
    }
  }

  async function submit(obs: number[]) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations: obs }),
      })
      if (!res.ok) throw new Error('failed')
      setResult(await res.json())
    } catch {
      setError('Could not reach services. Make sure both backends are running.')
      setLoading(false)
    }
  }

  // ── Result screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        <p className="text-xl animate-pulse">Analysing your profile…</p>
      </main>
    )
  }

  if (result) {
    const dominantIndex = result.personality_vector.indexOf(Math.max(...result.personality_vector))
    const dominantType = AXES[dominantIndex] ?? result.personality
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 text-white gap-6 p-8">
        <h2 className="text-2xl font-bold">Your travel personality</h2>
        <div className="bg-white rounded-2xl p-6">
          <PersonalityRadar personality_vector={result.personality_vector} />
        </div>
        <p className="text-xl font-semibold text-emerald-300">{dominantType}</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Link
          href="/discover"
          className="rounded-full bg-emerald-500 px-8 py-3 font-semibold hover:bg-emerald-400 transition-colors"
        >
          Discover your matches
        </Link>
      </main>
    )
  }

  // ── Progress bar ─────────────────────────────────────────────────────────

  const progress = (step / TOTAL) * 100

  // ── Step renderer ─────────────────────────────────────────────────────────

  function renderStep() {
    // Steps 0–5: SwipeCard
    if (step <= 5) {
      const card = SWIPE_CARDS[step]
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-emerald-300 text-sm">Swipe right to include, left to skip</p>
          <SwipeCard onChoice={(dir: 'left' | 'right') => push(dir === 'right' ? 1 : 0)}>
            <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
            <p className="mt-2 text-sm text-gray-500">{card.desc}</p>
          </SwipeCard>
        </div>
      )
    }

    // Steps 6–8: Audio choice
    if (step <= 8) {
      const audio = AUDIO_STEPS[step - 6]
      return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-center text-emerald-300 text-sm">{audio.question}</p>
          {audio.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => push(i / (audio.options.length - 1))}
              className="rounded-xl bg-emerald-900 border border-emerald-700 px-5 py-4 text-left hover:bg-emerald-800 transition-colors"
            >
              <span className="text-2xl mr-3">🔊</span>
              <span className="text-sm font-medium">{opt}</span>
            </button>
          ))}
        </div>
      )
    }

    // Steps 9–11: Scroll cards
    if (step <= 11) {
      const scroll = SCROLL_STEPS[step - 9]
      return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <p className="text-center text-emerald-300 text-sm">{scroll.question}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scroll.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => push(i / (scroll.options.length - 1))}
                className="flex-shrink-0 rounded-2xl bg-emerald-900 border border-emerald-700 px-6 py-5 text-sm font-semibold hover:bg-emerald-800 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Steps 12–13: Emoji scenario
    if (step <= 13) {
      const scenario = EMOJI_STEPS[step - 12]
      return (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <p className="text-center text-emerald-300 text-sm">{scenario.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {scenario.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => push(i / (scenario.options.length - 1))}
                className="rounded-2xl bg-emerald-900 border border-emerald-700 flex flex-col items-center py-5 gap-2 hover:bg-emerald-800 transition-colors"
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Step 14: Budget slider
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <p className="text-center text-emerald-300 text-sm">What's your daily budget?</p>
        <div className="text-center text-4xl font-bold">€{budget}</div>
        <input
          type="range"
          min={20}
          max={200}
          step={5}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-emerald-500"
          aria-label="Daily budget in euros"
          title="Daily budget"
        />
        <div className="flex justify-between text-xs text-emerald-600">
          <span>€20</span>
          <span>€200</span>
        </div>
        <button
          type="button"
          onClick={() => push(budget / 200)}
          className="rounded-full bg-emerald-500 py-3 font-semibold hover:bg-emerald-400 transition-colors"
        >
          Finish
        </button>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-emerald-950 text-white pt-10 px-6">
      {/* Progress bar */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-xs text-emerald-600 mb-1">
          <span>Step {step + 1} of {TOTAL}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-emerald-900">
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {renderStep()}
    </main>
  )
}
