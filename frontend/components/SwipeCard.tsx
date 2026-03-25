'use client'

type Props = {
  title: string
  onNext: () => void
}

export default function SwipeCard({ title, onNext }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-medium">{title}</h2>
      <div className="mt-4 flex gap-2">
        <button onClick={onNext} className="rounded bg-black px-4 py-2 text-white">Like</button>
        <button onClick={onNext} className="rounded border px-4 py-2">Skip</button>
      </div>
    </div>
  )
}
