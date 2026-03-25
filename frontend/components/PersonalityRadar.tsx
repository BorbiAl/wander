type Props = {
  values: number[]
}

export default function PersonalityRadar({ values }: Props) {
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-medium">Personality Radar</h2>
      <p className="mt-2 text-sm">Average signal: {avg.toFixed(2)}</p>
    </div>
  )
}
