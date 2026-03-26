import { NextResponse } from 'next/server';
import { computePersonality, matchScore } from '@/app/lib/hmm';
import { EXPERIENCES } from '@/app/lib/data';

async function tryPythonHMM(observations: number[]) {
  const res = await fetch('http://localhost:5000/hmm/decode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observations }),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Python HMM returned ${res.status}`);
  const data = await res.json();
  // Normalise Python response to the same shape the frontend expects
  return {
    vector: data.personality_vector as [number, number, number, number, number],
    dominant: data.dominant_type as string,
    dominantIndex: (data.personality_vector as number[]).indexOf(
      Math.max(...(data.personality_vector as number[]))
    ),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { observations } = body;

    // Step 1: Try the real Python HMM; fall back to local TS implementation
    let personality;
    try {
      personality = await tryPythonHMM(observations);
    } catch {
      personality = computePersonality(observations);
    }

    // Step 2: Try the C++ graph engine for matches; fall back to local scoring
    let matches;
    try {
      const graphRes = await fetch('http://localhost:8081/graph/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_vector: personality.vector }),
        signal: AbortSignal.timeout(3000),
      });
      if (!graphRes.ok) throw new Error(`C++ engine returned ${graphRes.status}`);
      matches = await graphRes.json();
    } catch {
      // Local fallback: score against static data
      matches = EXPERIENCES.map(exp => ({
        ...exp,
        score: matchScore(personality.vector, exp.personalityWeights),
      })).sort((a, b) => b.score - a.score).slice(0, 10);
    }

    return NextResponse.json({ personality, matches });
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
