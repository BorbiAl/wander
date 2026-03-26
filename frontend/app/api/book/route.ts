import { NextResponse } from 'next/server';
import { getExperience, getVillage } from '@/app/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { experienceId, amount, userId } = body;

    // Try C++ engine first
    try {
      const res = await fetch('http://localhost:8081/graph/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_id: experienceId,
          amount_eur: amount,
          user_id: userId ?? 'anonymous',
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`C++ returned ${res.status}`);
      const data = await res.json();

      // Normalise C++ response → frontend shape
      const exp = getExperience(experienceId);
      const village = exp ? getVillage(exp.villageId) : null;
      const cws_base = village?.cws ?? 50;
      const points = 10 + Math.max(0, Math.floor((100 - cws_base) / 5));

      return NextResponse.json({
        bookingId: 'bkg_' + data.booking_id,
        split: data.money_flow,
        cwsDelta: data.cws_delta,
        points,
        villageName: village?.name ?? data.village_id,
        hostName: exp?.hostId ?? '',
      });
    } catch {
      // Fallback: compute locally
      const exp = getExperience(experienceId);
      if (!exp) return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
      const village = getVillage(exp.villageId);
      if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 });

      const split = {
        host: amount * 0.70,
        community: amount * 0.15,
        culture: amount * 0.10,
        platform: amount * 0.05,
      };
      const cwsDelta = Math.round(amount * 0.3);
      const points = Math.floor(10 + (100 - village.cws) * 0.5);

      return NextResponse.json({
        bookingId: 'bkg_' + Math.random().toString(36).slice(2, 8),
        split,
        cwsDelta,
        points,
        villageName: village.name,
        hostName: exp.hostId,
      });
    }
  } catch (error) {
    console.error('Booking API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
