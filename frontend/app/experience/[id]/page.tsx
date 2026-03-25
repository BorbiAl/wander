type Props = {
  params: {
    id: string
  }
}

export default function ExperienceDetailPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">Experience {params.id}</h1>
      <p className="mt-3">Booking integration endpoint is ready at /api/book.</p>
      <button className="mt-6 rounded bg-black px-4 py-2 text-white">Book now</button>
    </main>
  )
}
