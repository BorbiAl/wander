'use client'

import { useState } from 'react'
import SwipeCard from '../../components/SwipeCard'
import AudioReactor from '../../components/AudioReactor'

const prompts = ['Nature', 'Culture', 'Food', 'Traditions']

export default function OnboardingPage() {
  const [index, setIndex] = useState(0)
  const current = prompts[index] ?? 'Done'

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Onboarding</h1>
      <div className="mt-6 grid gap-4">
        <SwipeCard title={current} onNext={() => setIndex((v) => Math.min(v + 1, prompts.length))} />
        <AudioReactor level={Math.min(index + 1, 5)} />
      </div>
    </main>
  )
}
