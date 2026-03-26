import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';
import { matchScore } from '@/app/lib/hmm';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

function normalise(e: Record<string, unknown>, groupVector: number[], memberVectors: number[][]) {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  const weights = pw.slice(0, 5) as [number, number, number, number, number];
  const score = (e.score ?? matchScore(groupVector, weights)) as number;
  const memberScores = memberVectors.map(mv => matchScore(mv, weights));
  const minMemberScore = memberScores.length > 0 ? Math.min(...memberScores) : score;
  return {
    id: e.id,
    villageId: e.village_id ?? e.villageId,
    name: (e.name ?? e.title ?? '') as string,
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: e.duration_h ? `${e.duration_h}h` : (e.duration ?? ''),
    hostId: (e.host_id ?? e.hostId ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: weights,
    score,
    memberScores,
    minMemberScore,
  };
}

async function loadSeedExperiencesForFallback() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'data', 'experiences.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'experiences.json'),
  ];

  for (const seedPath of candidatePaths) {
    try {
      await access(seedPath);
      const raw = await readFile(seedPath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) return data as Record<string, unknown>[];
    } catch {
      // Try next candidate path.
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personality_vector, member_vectors = [] } = body as {
      personality_vector: number[];
      member_vectors: number[][];
    };

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
        return NextResponse.json(
          data.map(e => normalise(e as Record<string, unknown>, personality_vector, member_vectors))
        );
      }
      throw new Error('empty');
    } catch {
      // Fallback: score file-backed experiences, static data last.
      const fileBacked = await loadSeedExperiencesForFallback();
      const source: Record<string, unknown>[] = fileBacked.length > 0
        ? fileBacked
        : EXPERIENCES.map(e => ({ ...e, personality_weights: e.personalityWeights }));

      const matches = source
        .map(e => normalise(e, personality_vector, member_vectors))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return NextResponse.json(matches);
    }
  } catch (error) {
    console.error('Group Match API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
