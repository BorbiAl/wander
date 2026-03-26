import { NextResponse } from 'next/server';
import { computePersonality, matchScore } from '@/app/lib/hmm';
import { EXPERIENCES } from '@/app/lib/data';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { observations } = body;

    // Compute personality locally (instant) — no network round-trip needed
    const personality = (() => {
      try {
        return computePersonality(observations);
      } catch {
        return { vector: [0.2, 0.2, 0.2, 0.2, 0.2] as [number,number,number,number,number], dominant: 'Explorer', dominantIndex: 0 };
      }
    })();

    // Try C++ match in parallel with local scoring, take whichever finishes first
    const localMatches = EXPERIENCES.map(exp => ({
      ...exp,
      score: matchScore(personality.vector, exp.personalityWeights),
    })).sort((a, b) => b.score - a.score).slice(0, 10);

    let matches = localMatches;
    try {
      const graphRes = await fetch('http://localhost:8081/graph/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_vector: personality.vector }),
        signal: AbortSignal.timeout(1000),
      });
      if (graphRes.ok) {
        const data = await graphRes.json();
        if (Array.isArray(data) && data.length > 0) matches = data;
      }
    } catch {
      // keep localMatches
    }

    return NextResponse.json({ personality, matches });
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
