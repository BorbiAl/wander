import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';
import { matchScore } from '@/app/lib/hmm';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

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
      if (!Array.isArray(data)) continue;
      const mapped = data.map((e) => normalise(e as Record<string, unknown>));
      if (mapped.length > 0) return mapped;
    } catch {
      // Try next candidate path.
    }
  }

  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { personality_vector } = body;

    // Validate personality vector before hitting the engine or doing local scoring
    if (
      !Array.isArray(personality_vector) ||
      personality_vector.length !== 5 ||
      !(personality_vector as unknown[]).every(v => typeof v === 'number' && Number.isFinite(v))
    ) {
      return NextResponse.json({ error: 'personality_vector must be an array of 5 finite numbers' }, { status: 400 });
    }

    try {
      const res = await fetch('http://localhost:8081/graph/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality_vector }),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) throw new Error(`C++ returned ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data.map(normalise));
      }
      throw new Error('empty');
    } catch {
      // Fallback: score file-backed experiences first, static data last.
      const fileBacked = await loadSeedExperiencesForFallback();
      const source = fileBacked.length > 0 ? fileBacked : EXPERIENCES;
      const matches = source.map(exp => ({
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
