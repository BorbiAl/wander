'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AudioReactor from '@/components/AudioReactor'

interface MatchItem {
  id?: string
  name?: string
  score?: number
  type?: string
  village_id?: string
  price_eur?: number
  duration_hours?: number
}

interface StoredResult {
  matches?: MatchItem[]
  personality?: {
    dominant_type?: string
  }
}

function formatScore(score?: number) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'N/A'
  return `${(score * 100).toFixed(0)}%`
}

export default function DiscoverPage() {
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [personality, setPersonality] = useState('Explorer')

  useEffect(() => {
    const raw = window.localStorage.getItem('wander:lastResult')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as StoredResult
      setMatches(Array.isArray(parsed.matches) ? parsed.matches : [])
      setPersonality(parsed.personality?.dominant_type || 'Explorer')
    } catch {
      setMatches([])
    }
  }, [])

  const topMatches = useMemo(() => matches.slice(0, 6), [matches])

  return (
    <main className="min-h-screen px-6 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="wg-shell rounded-3xl p-6 sm:p-8">
          <p className="wg-pill inline-flex rounded-full px-4 py-1 text-xs uppercase tracking-[0.22em] text-emerald-100/90">
            personality: {personality}
          </p>
          <h1 className="mt-4 text-4xl font-bold text-emerald-50 sm:text-5xl">Your Best-Matched Experiences</h1>
          <p className="mt-3 max-w-2xl text-sm text-emerald-100/80 sm:text-base">
            Ranked by graph relevance to your onboarding profile. Use village links to view local context.
          </p>

          {topMatches.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-emerald-200/30 bg-emerald-900/25 p-5 text-emerald-100/85">
              No saved matches yet. Complete onboarding first, then return here.
              <div className="mt-4">
                <Link href="/onboarding" className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">
                  Start onboarding
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {topMatches.map((item, idx) => (
                <article key={`${item.id ?? 'm'}-${idx}`} className="rounded-2xl border border-emerald-200/30 bg-emerald-950/30 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-emerald-50">{item.name || 'Untitled experience'}</h2>
                    <span className="rounded-full bg-emerald-300/20 px-3 py-1 text-sm font-semibold text-emerald-100">
                      Match {formatScore(item.score)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-100/80">
                    {item.type ? <span className="wg-pill rounded-full px-3 py-1">{item.type}</span> : null}
                    {item.duration_hours ? <span className="wg-pill rounded-full px-3 py-1">{item.duration_hours}h</span> : null}
                    {item.price_eur ? <span className="wg-pill rounded-full px-3 py-1">EUR {item.price_eur}</span> : null}
                    {item.village_id ? (
                      <Link className="wg-pill rounded-full px-3 py-1 transition hover:bg-emerald-400/20" href={`/village/${item.village_id}`}>
                        village {item.village_id}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside>
          <AudioReactor />
        </aside>
      </div>
    </main>
  )
}
