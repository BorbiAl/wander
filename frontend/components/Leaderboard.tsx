type Entry = {
  name: string
  score: number
}

type Props = {
  entries: Entry[]
}

export default function Leaderboard({ entries }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-medium">Leaderboard</h2>
      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li key={entry.name} className="flex justify-between">
            <span>{entry.name}</span>
            <span>{entry.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
