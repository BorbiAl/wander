import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';
import { matchScore } from '@/app/lib/hmm';

// Normalise C++ match result → frontend Experience + score shape
function normalise(e: Record<string, unknown>) {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  return {
    id: e.id,
    villageId: e.village_id,
    name: (e.name ?? e.title ?? '') as string,
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: e.duration_h ? `${e.duration_h}h` : (e.duration ?? ''),
    hostId: (e.host_id ?? e.hostId ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: pw.slice(0, 5) as [number, number, number, number, number],
    score: (e.score ?? 0) as number,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personality_vector } = body;

    try {
      const res = await fetch('http://localhost:8081/graph/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_vector }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`C++ returned ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data.map(normalise));
      }
      throw new Error('empty');
    } catch {
      // Fallback: score local static data
      const matches = EXPERIENCES.map(exp => ({
        ...exp,
        score: matchScore(personality_vector, exp.personalityWeights),
      })).sort((a, b) => b.score - a.score).slice(0, 10);
      return NextResponse.json(matches);
    }
  } catch (error) {
    console.error('Match API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
