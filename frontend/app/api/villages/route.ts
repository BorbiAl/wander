import { NextResponse } from 'next/server';
import { VILLAGES } from '@/app/lib/data';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

// Normalise C++ village shape → frontend Village type
function normalise(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    country: (v.country ?? 'Bulgaria') as string,
    region: v.region ?? '',
    cws: (v.cws ?? v.cws_base ?? 50) as number,
    population: v.population ?? 0,
    description: v.description ?? '',
    nearby: (v.nearby ?? []) as string[],
  };
}

function normaliseSeedVillage(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    country: (v.country ?? 'Bulgaria') as string,
    region: v.region ?? '',
    cws: (v.cws ?? 50) as number,
    population: v.population ?? 0,
    description: v.description ?? '',
    nearby: (v.nearby ?? []) as string[],
  };
}

async function loadSeedVillages() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'data', 'villages.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'villages.json'),
  ];

  for (const seedPath of candidatePaths) {
    try {
      await access(seedPath);
      const raw = await readFile(seedPath, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map((v) => normaliseSeedVillage(v as Record<string, unknown>));
    } catch {
      // Try next candidate path.
    }
  }

  return [];
}

export async function GET() {
  const seedVillages = await loadSeedVillages();

  try {
    const res = await fetch('http://localhost:8081/graph/villages', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`C++ returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const cppVillages = data.map(normalise);
      const merged = new Map<string, (typeof VILLAGES)[number]>();
      for (const v of VILLAGES) merged.set(v.id, v);
      for (const v of seedVillages) merged.set(String(v.id), v as (typeof VILLAGES)[number]);
      for (const v of cppVillages) merged.set(String(v.id), v as (typeof VILLAGES)[number]);
      return NextResponse.json(Array.from(merged.values()));
    }
    throw new Error('empty response');
  } catch {
    const merged = new Map<string, (typeof VILLAGES)[number]>();
    for (const v of VILLAGES) merged.set(v.id, v);
    for (const v of seedVillages) merged.set(String(v.id), v as (typeof VILLAGES)[number]);
    return NextResponse.json(Array.from(merged.values()));
  }
}
