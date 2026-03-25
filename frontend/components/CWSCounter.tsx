type Props = {
  value: number
}

export default function CWSCounter({ value }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-medium">Community Wellbeing Score</h2>
      <p className="mt-2 text-3xl font-bold">{value.toFixed(1)}</p>
    </div>
  )
}
