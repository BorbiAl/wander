import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'node:fs/promises';
import { getCached, setCached } from '@/app/lib/fileCache';
import path from 'node:path';

const FILE_CACHE_TTL_MS = 60_000;
const CACHE_HEADER = 's-maxage=30, stale-while-revalidate=60';

type VolunteerEntry = Record<string, unknown>;

async function loadVolunteeringFromJson(): Promise<VolunteerEntry[]> {
  const CACHE_KEY = 'seed:volunteering';
  const cached = getCached<VolunteerEntry[]>(CACHE_KEY);
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
      const result = (data as VolunteerEntry[]).filter((e) => e.type === 'volunteer');
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
 * GET /api/volunteering
 *
 * Returns volunteer experiences. Active events (isActive=true) are sorted first.
 *
 * Query params (all optional):
 *   village_id    Filter by village ID
 *   active_only   "true" to return only currently active events
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const villageId  = searchParams.get('village_id')?.trim() ?? null;
  const activeOnly = searchParams.get('active_only') === 'true';

  try {
    const url = new URL('http://localhost:8081/graph/volunteering');
    if (villageId)  url.searchParams.set('village_id', villageId);
    if (activeOnly) url.searchParams.set('active_only', 'true');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const data = await res.json() as unknown[];
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');

    return NextResponse.json(data, { headers: { 'Cache-Control': CACHE_HEADER } });
  } catch {
    let fallback = await loadVolunteeringFromJson();
    if (villageId)  fallback = fallback.filter((e) => e.village_id === villageId);
    if (activeOnly) fallback = fallback.filter((e) => e.isActive === true);

    // Active events first
    fallback.sort((a, b) => {
      const aActive = a.isActive === true ? 1 : 0;
      const bActive = b.isActive === true ? 1 : 0;
      return bActive - aActive;
    });

    return NextResponse.json(fallback, { headers: { 'Cache-Control': CACHE_HEADER } });
  }
}
