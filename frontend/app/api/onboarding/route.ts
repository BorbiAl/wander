import { NextResponse } from 'next/server';
import { computePersonality, matchScore } from '@/app/lib/hmm';
import { EXPERIENCES } from '@/app/lib/data';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { observations } = body;

    // Run HMM locally instead of Python
    const personality = computePersonality(observations);

    // Compute matches
    const matches = EXPERIENCES.map(exp => ({
      ...exp,
      score: matchScore(personality.vector, exp.personalityWeights)
    })).sort((a, b) => b.score - a.score).slice(0, 10);

    return NextResponse.json({ personality, matches });
  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
