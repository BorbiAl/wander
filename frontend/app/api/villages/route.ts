import { NextResponse } from 'next/server';
import { VILLAGES } from '@/app/lib/data';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

// Normalise C++ village shape → frontend Village type
function normalise(v: Record<string, unknown>) {
  return {
    id: String(v.id ?? ''),
    name: String(v.name ?? ''),
    lat: Number(v.lat ?? 0),
    lng: Number(v.lng ?? 0),
    country: (v.country ?? 'Bulgaria') as string,
    region: String(v.region ?? ''),
    cws: (v.cws ?? v.cws_base ?? 50) as number,
    population: Number(v.population ?? 0),
    description: String(v.description ?? ''),
    nearby: (v.nearby ?? []) as string[],
    mainCity: (v.main_city ?? v.mainCity ?? '') as string,
    mainCityLat: Number(v.main_city_lat ?? v.mainCityLat ?? 0),
    mainCityLng: Number(v.main_city_lng ?? v.mainCityLng ?? 0),
  };
}

function normaliseSeedVillage(v: Record<string, unknown>) {
  return {
    id: String(v.id ?? ''),
    name: String(v.name ?? ''),
    lat: Number(v.lat ?? 0),
    lng: Number(v.lng ?? 0),
    country: (v.country ?? 'Bulgaria') as string,
    region: String(v.region ?? ''),
    cws: (v.cws ?? 50) as number,
    population: Number(v.population ?? 0),
    description: String(v.description ?? ''),
    nearby: (v.nearby ?? []) as string[],
    mainCity: (v.main_city ?? v.mainCity ?? '') as string,
    mainCityLat: Number(v.main_city_lat ?? v.mainCityLat ?? 0),
    mainCityLng: Number(v.main_city_lng ?? v.mainCityLng ?? 0),
  };
}

function mergeVillagePreferSeed(
  seedVillage: (typeof VILLAGES)[number] | undefined,
  cppVillage: (typeof VILLAGES)[number],
) {
  if (!seedVillage) return cppVillage;
  return {
    ...cppVillage,
    country: cppVillage.country || seedVillage.country,
    region: cppVillage.region || seedVillage.region,
    description: cppVillage.description || seedVillage.description,
    nearby: cppVillage.nearby.length > 0 ? cppVillage.nearby : seedVillage.nearby,
    cws: cppVillage.cws > 0 ? cppVillage.cws : seedVillage.cws,
    population: cppVillage.population > 0 ? cppVillage.population : seedVillage.population,
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
      for (const v of seedVillages) merged.set(String(v.id), v as (typeof VILLAGES)[number]);
      for (const v of cppVillages) {
        const id = String(v.id);
        const seedVillage = merged.get(id);
        merged.set(id, mergeVillagePreferSeed(seedVillage, v as (typeof VILLAGES)[number]));
      }
      return NextResponse.json(Array.from(merged.values()));
    }
    throw new Error('empty response');
  } catch {
    if (seedVillages.length > 0) {
      return NextResponse.json(seedVillages);
    }
    return NextResponse.json(VILLAGES);
  }
}
