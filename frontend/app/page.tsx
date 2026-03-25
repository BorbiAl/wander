import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight">WanderGraph</h1>
        <p className="mt-4 text-xl text-emerald-300">Travel with Purpose</p>
        <Link
          href="/onboarding"
          className="mt-10 inline-block rounded-full bg-emerald-500 px-10 py-4 text-lg font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          Start
        </Link>
      </div>
    </main>
  )
}
