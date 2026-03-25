import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { observations } = await req.json()

    const hmrRes = await fetch('http://localhost:5000/hmm/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observations }),
    })

    if (!hmrRes.ok) {
      return NextResponse.json({ error: 'HMM service error' }, { status: 502 })
    }

    const { personality_vector } = await hmrRes.json()

    const graphRes = await fetch('http://localhost:8081/graph/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personality_vector }),
    })

    if (!graphRes.ok) {
      return NextResponse.json({ error: 'Graph service error' }, { status: 502 })
    }

    const { personality, matches } = await graphRes.json()

    return NextResponse.json({ personality, matches })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
