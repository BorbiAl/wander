import VillageMap from '../../components/VillageMap'
import ExperienceCard from '../../components/ExperienceCard'

const experiences = [
  { id: 'exp_1', title: 'Stone House Walk', village: 'Kovachevitsa' },
  { id: 'exp_2', title: 'Folklore Evening', village: 'Shiroka Laka' }
]

export default function DiscoverPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Discover</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <VillageMap villages={['Kovachevitsa', 'Shiroka Laka']} />
        <div className="grid gap-3">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.id} id={exp.id} title={exp.title} subtitle={exp.village} />
          ))}
        </div>
      </div>
    </main>
  )
}
