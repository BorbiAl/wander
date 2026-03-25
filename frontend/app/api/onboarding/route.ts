import { NextRequest, NextResponse } from 'next/server'

const HMM_URL = process.env.HMM_URL ?? 'http://localhost:5000/predict'
const ENGINE_URL = process.env.ENGINE_URL ?? 'http://localhost:8080/metrics'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const [hmmRes, engineRes] = await Promise.all([
    fetch(HMM_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
    fetch(ENGINE_URL)
  ])

  const hmm = await hmmRes.json()
  const engine = await engineRes.json()

  return NextResponse.json({ hmm, engine })
}
