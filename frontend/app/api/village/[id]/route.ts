import { NextRequest, NextResponse } from 'next/server'

const ENGINE_BASE = process.env.ENGINE_URL_BASE ?? 'http://localhost:8081/graph/village'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await fetch(`${ENGINE_BASE}/${params.id}`)
  if (!result.ok) {
    return NextResponse.json({ error: 'Village not found' }, { status: 404 })
  }
  const payload = await result.json()
  return NextResponse.json(payload)
}
