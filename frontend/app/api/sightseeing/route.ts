import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'node:fs/promises';
import { getCached, setCached } from '@/app/lib/fileCache';
import path from 'node:path';

const FILE_CACHE_TTL_MS = 60_000;
const CACHE_HEADER = 's-maxage=60, stale-while-revalidate=300';

type SightseeingEntry = Record<string, unknown>;

async function loadFreeSightseeingFromJson(): Promise<SightseeingEntry[]> {
  const CACHE_KEY = 'seed:sightseeing';
  const cached = getCached<SightseeingEntry[]>(CACHE_KEY);
  if (cached) return cached;

  const candidates = [
    path.resolve(process.cwd(), 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'data', 'experiences.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'experiences.json'),
  ];

  for (const p of candidates) {
    try {
      await access(p);
      const raw = await readFile(p, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) continue;
      const result = (data as SightseeingEntry[]).filter(
        (e) => e.type === 'sightseeing' && (e.isFree === true || e.price_eur === 0),
      );
      if (result.length > 0) {
        setCached(CACHE_KEY, result, FILE_CACHE_TTL_MS);
        return result;
      }
    } catch {
      // try next path
    }
  }

  return [];
}

/**
 * GET /api/sightseeing
 *
 * Returns free sightseeing experiences (isFree=true or price_eur=0).
 *
 * Query params (all optional):
 *   village_id   Filter by village ID
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const villageId = searchParams.get('village_id')?.trim() ?? null;

  try {
    const url = new URL('http://localhost:8081/graph/sightseeing');
    if (villageId) url.searchParams.set('village_id', villageId);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const data = await res.json() as unknown[];
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');

    return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_HEADER } });
  } catch {
    let fallback = await loadFreeSightseeingFromJson();
    if (villageId) fallback = fallback.filter((e) => e.village_id === villageId);
    return NextResponse.json(fallback, { headers: { 'Cache-Control': CACHE_HEADER } });
  }
}
