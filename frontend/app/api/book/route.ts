import { NextRequest, NextResponse } from 'next/server'

const ENGINE_BOOK_URL = process.env.ENGINE_BOOK_URL ?? 'http://localhost:8080/book'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = await fetch(ENGINE_BOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false }, { status: 502 })
  }

  const payload = await result.json().catch(() => ({ ok: true }))
  return NextResponse.json(payload)
}
