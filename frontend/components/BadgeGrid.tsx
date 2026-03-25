type Props = {
  badges: string[]
}

export default function BadgeGrid({ badges }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-medium">Badges</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {badges.map((badge) => (
          <div key={badge} className="rounded border px-3 py-2 text-sm">
            {badge}
          </div>
        ))}
      </div>
    </div>
  )
}
