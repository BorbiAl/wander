import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

// Normalise C++ experience shape → frontend Experience type
function normalise(e: Record<string, unknown>) {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  return {
    id: e.id,
    villageId: e.village_id,
    name: (e.title ?? e.name) as string,
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: e.duration_h ? `${e.duration_h}h` : (e.duration ?? ''),
    hostId: (e.host_id ?? e.hostId ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: pw.slice(0, 5) as [number, number, number, number, number],
  };
}

function normaliseSeedExperience(e: Record<string, unknown>) {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  return {
    id: e.id,
    villageId: e.villageId,
    name: (e.name ?? 'Village Experience') as string,
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: (e.duration ?? '') as string,
    hostId: (e.hostId ?? e.host_id ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: pw.slice(0, 5) as [number, number, number, number, number],
  };
}

async function loadSeedExperiences() {
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
      if (!Array.isArray(data)) return [];
      return data.map((e) => normaliseSeedExperience(e as Record<string, unknown>));
    } catch {
      // Try next candidate path.
    }
  }

  return [];
}

export async function GET() {
  const seedExperiences = await loadSeedExperiences();

  try {
    const res = await fetch('http://localhost:8081/graph/experiences', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`C++ returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const cppExperiences = data.map(normalise);
      const merged = new Map<string, (typeof EXPERIENCES)[number]>();
      for (const e of seedExperiences) merged.set(String(e.id), e as (typeof EXPERIENCES)[number]);
      for (const e of cppExperiences) merged.set(String(e.id), e as (typeof EXPERIENCES)[number]);
      return NextResponse.json(Array.from(merged.values()));
    }
    throw new Error('empty response');
  } catch {
    if (seedExperiences.length > 0) {
      return NextResponse.json(seedExperiences);
    }
    return NextResponse.json(EXPERIENCES);
  }
}
