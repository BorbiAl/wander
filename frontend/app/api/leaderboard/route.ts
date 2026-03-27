import { NextResponse } from 'next/server';

/** Cache the leaderboard for 30 s, serve stale for 60 s while revalidating. */
const CACHE_HEADER = 'public, s-maxage=30, stale-while-revalidate=60';

export async function GET() {
  try {
    const res = await fetch('http://localhost:8081/graph/leaderboard', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': CACHE_HEADER },
    });
  } catch {
    // Engine offline — return empty leaderboard with a short cache TTL so
    // the client retries soon rather than hammering the (unavailable) endpoint.
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
    });
  }
}
