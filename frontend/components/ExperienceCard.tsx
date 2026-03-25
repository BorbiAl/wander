import Link from 'next/link'

type Props = {
  id: string
  title: string
  subtitle: string
}

export default function ExperienceCard({ id, title, subtitle }: Props) {
  return (
    <Link href={`/experience/${id}`} className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-600">{subtitle}</p>
    </Link>
  )
}
