type Props = {
  level: number
}

export default function AudioReactor({ level }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="text-sm">Audio activity</p>
      <div className="mt-2 h-3 rounded bg-slate-200">
        <div className="h-3 rounded bg-black" style={{ width: `${Math.min(100, level * 20)}%` }} />
      </div>
    </div>
  )
}
