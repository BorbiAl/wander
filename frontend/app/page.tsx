import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="wg-shell relative w-full max-w-3xl rounded-3xl p-8 sm:p-12">
        <p className="wg-pill inline-flex rounded-full px-4 py-1 text-xs uppercase tracking-[0.22em] text-emerald-100/90">
          mindful travel graph
        </p>
        <h1 className="mt-6 text-5xl font-bold text-emerald-50 sm:text-7xl">WanderGraph</h1>
        <p className="mt-5 max-w-xl text-lg text-emerald-100/85 sm:text-xl">
          Match your personality to villages and experiences designed around pace, place, and purpose.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="rounded-full bg-emerald-400 px-10 py-4 text-base font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            Begin Profiling
          </Link>
          <span className="text-sm text-emerald-100/70">15 quick choices · under 2 minutes</span>
        </div>
        <div className="mt-10 grid gap-3 text-sm text-emerald-50/85 sm:grid-cols-3">
          <div className="wg-pill rounded-2xl p-4">HMM personality decode</div>
          <div className="wg-pill rounded-2xl p-4">Graph-based ranking</div>
          <div className="wg-pill rounded-2xl p-4">Village-first booking flow</div>
        </div>
      </div>
    </main>
  )
}
