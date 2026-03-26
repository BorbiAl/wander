import { NextResponse } from 'next/server';
import { VILLAGES } from '@/app/lib/data';

// Normalise C++ village shape → frontend Village type
function normalise(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    region: v.region ?? '',
    cws: (v.cws ?? v.cws_base ?? 50) as number,
    population: v.population ?? 0,
    description: v.description ?? '',
    nearby: (v.nearby ?? []) as string[],
  };
}

export async function GET() {
  try {
    const res = await fetch('http://localhost:8081/graph/villages', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`C++ returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data.map(normalise));
    }
    throw new Error('empty response');
  } catch {
    // Fallback: build from individual village endpoints if bulk not available,
    // or return the static data
    return NextResponse.json(VILLAGES);
  }
}
