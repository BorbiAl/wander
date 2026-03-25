import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-4xl font-bold">WanderGraph</h1>
      <p className="mt-4 text-lg">Discover meaningful travel experiences in Bulgarian villages.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/onboarding" className="rounded bg-black px-4 py-2 text-white">Start onboarding</Link>
        <Link href="/discover" className="rounded border px-4 py-2">Discover</Link>
      </div>
    </main>
  )
}
