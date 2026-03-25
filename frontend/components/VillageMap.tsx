type Props = {
  villages: string[]
}

export default function VillageMap({ villages }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-medium">Village Map</h2>
      <ul className="mt-3 space-y-1">
        {villages.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    </div>
  )
}
