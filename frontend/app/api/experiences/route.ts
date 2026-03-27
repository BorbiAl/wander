import { NextRequest, NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';
import { readFile, access } from 'node:fs/promises';
import { getCached, setCached } from '@/app/lib/fileCache';
import path from 'node:path';

/** Server-side TTL for the parsed JSON — avoids re-reading disk on every request. */
const FILE_CACHE_TTL_MS = 60_000; // 60 s
/** Default page size when the client requests pagination. */
const DEFAULT_PAGE_LIMIT = 100;
/** Maximum page size accepted from query params. */
const MAX_PAGE_LIMIT = 500;

type NormalisedExperience = {
  id: string;
  villageId: string;
  name: string;
  type: string;
  price: number;
  duration: string;
  hostId: string;
  description: string;
  personalityWeights: [number, number, number, number, number];
  mainCity: string;
  mainCityLat: number;
  mainCityLng: number;
};

// Normalise C++ experience shape → frontend Experience type
function normalise(e: Record<string, unknown>): NormalisedExperience {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  return {
    id: String(e.id ?? ''),
    villageId: String(e.village_id ?? ''),
    name: (e.title ?? e.name) as string,
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: e.duration_h ? `${e.duration_h}h` : String(e.duration ?? ''),
    hostId: (e.host_id ?? e.hostId ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: pw.slice(0, 5) as [number, number, number, number, number],
    mainCity: (e.main_city ?? e.mainCity ?? '') as string,
    mainCityLat: Number(e.main_city_lat ?? e.mainCityLat ?? 0),
    mainCityLng: Number(e.main_city_lng ?? e.mainCityLng ?? 0),
  };
}

function normaliseSeedExperience(e: Record<string, unknown>): NormalisedExperience {
  const pw = (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as number[];
  while (pw.length < 5) pw.push(0.2);
  return {
    id: String(e.id ?? ''),
    villageId: String(e.villageId ?? e.village_id ?? ''),
    name: String(e.title ?? e.name ?? ''),
    type: (e.type ?? 'craft') as string,
    price: (e.price_eur ?? e.price ?? 0) as number,
    duration: e.duration_h ? `${e.duration_h}h` : String(e.duration ?? ''),
    hostId: (e.hostId ?? e.host_id ?? '') as string,
    description: (e.description ?? '') as string,
    personalityWeights: pw.slice(0, 5) as [number, number, number, number, number],
    mainCity: (e.main_city ?? e.mainCity ?? '') as string,
    mainCityLat: Number(e.main_city_lat ?? e.mainCityLat ?? 0),
    mainCityLng: Number(e.main_city_lng ?? e.mainCityLng ?? 0),
  };
}

async function loadSeedExperiences(): Promise<NormalisedExperience[]> {
  const CACHE_KEY = 'seed:experiences';
  const cached = getCached<NormalisedExperience[]>(CACHE_KEY);
  if (cached) return cached;

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
      const result = data.map((e) => normaliseSeedExperience(e as Record<string, unknown>));
      if (result.length > 0) {
        setCached(CACHE_KEY, result, FILE_CACHE_TTL_MS);
        return result;
      }
    } catch {
      // Try next candidate path.
    }
  }

  return [];
}

const HTTP_CACHE_HEADERS = {
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
};

/**
 * GET /api/experiences
 *
 * Query params (all optional):
 *   villageId  Comma-separated village IDs — returns only experiences for those villages
 *   type       Experience type filter (e.g. "hike", "craft")
 *   limit      Page size (default: all; max: 500)
 *   offset     Zero-based offset into the filtered result set (default: 0)
 *
 * Response headers:
 *   X-Total-Count  Total number of experiences matching the filter (before pagination)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Parse filter params
  const idParam = searchParams.get('id');
  const villageIdParam = searchParams.get('villageId');
  const typeParam = searchParams.get('type');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const idFilter = idParam?.trim() ?? null;

  const villageIdSet = villageIdParam
    ? new Set(villageIdParam.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const typeFilter = typeParam?.trim().toLowerCase() ?? null;

  const limit = limitParam !== null
    ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_PAGE_LIMIT), MAX_PAGE_LIMIT)
    : null;
  const offset = offsetParam !== null ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

  const seedExperiences = await loadSeedExperiences();

  // Build the full merged set (engine → seed → static fallback)
  let allExperiences: NormalisedExperience[];

  try {
    const res = await fetch('http://localhost:8081/graph/experiences', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const data = await res.json() as unknown[];
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty response');

    const cppExperiences = data.map(e => normalise(e as Record<string, unknown>));
    const merged = new Map<string, NormalisedExperience>();
    for (const e of seedExperiences) merged.set(e.id, e);
    for (const e of cppExperiences) merged.set(e.id, e);
    allExperiences = Array.from(merged.values());
  } catch {
    allExperiences = seedExperiences.length > 0
      ? seedExperiences
      : (EXPERIENCES as unknown as NormalisedExperience[]);
  }

  // Apply server-side filters
  let filtered = allExperiences;
  if (idFilter) {
    filtered = filtered.filter(e => e.id === idFilter);
  }
  if (villageIdSet) {
    filtered = filtered.filter(e => villageIdSet.has(e.villageId));
  }
  if (typeFilter) {
    filtered = filtered.filter(e => e.type.toLowerCase() === typeFilter);
  }

  const total = filtered.length;

  // Apply pagination only when the client explicitly requests it
  const page = limit !== null ? filtered.slice(offset, offset + limit) : filtered;

  const headers: Record<string, string> = {
    ...HTTP_CACHE_HEADERS,
    'X-Total-Count': String(total),
  };

  return NextResponse.json(page, { headers });
}
