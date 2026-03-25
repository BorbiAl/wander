import PersonalityRadar from '../../components/PersonalityRadar'
import BadgeGrid from '../../components/BadgeGrid'

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <div className="mt-6 grid gap-4">
        <PersonalityRadar values={[0.7, 0.4, 0.9, 0.6, 0.5]} />
        <BadgeGrid badges={['Explorer', 'Culture Seeker', 'Local Supporter']} />
      </div>
    </main>
  )
}
