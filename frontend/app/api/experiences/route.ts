import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';

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

export async function GET() {
  try {
    const res = await fetch('http://localhost:8081/graph/experiences', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`C++ returned ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data.map(normalise));
    }
    throw new Error('empty response');
  } catch {
    return NextResponse.json(EXPERIENCES);
  }
}
