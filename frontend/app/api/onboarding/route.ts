import { NextRequest, NextResponse } from 'next/server'

const HMM_URL = process.env.HMM_URL ?? 'http://localhost:5000/hmm/decode'
const ENGINE_URL = process.env.ENGINE_URL ?? 'http://localhost:8081/graph/match'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Step 1: observations → personality vector (Python HMM)
  const hmmRes = await fetch(HMM_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ observations: body.observations }),
  })

  if (!hmmRes.ok) {
    return NextResponse.json({ error: 'HMM decode failed' }, { status: 502 })
  }

  const personality = await hmmRes.json()

  // Step 2: personality vector → ranked experiences (C++ graph engine)
  const graphRes = await fetch(ENGINE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ personality_vector: personality.personality_vector }),
  })

  if (!graphRes.ok) {
    return NextResponse.json({ error: 'Graph match failed' }, { status: 502 })
  }

  const matches = await graphRes.json()

  return NextResponse.json({ personality, matches })
}
