import CWSCounter from '../../components/CWSCounter'
import SankeyDiagram from '../../components/SankeyDiagram'
import Leaderboard from '../../components/Leaderboard'

export default function ImpactPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Impact Dashboard</h1>
      <div className="mt-6 grid gap-4">
        <CWSCounter value={74.3} />
        <SankeyDiagram />
        <Leaderboard entries={[{ name: 'Kovachevitsa', score: 91 }, { name: 'Shiroka Laka', score: 87 }]} />
      </div>
    </main>
  )
}
