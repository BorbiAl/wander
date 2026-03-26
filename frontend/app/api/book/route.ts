import { NextResponse } from 'next/server';
import { getExperience, getVillage } from '@/app/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { experienceId, amount } = body;

    const exp = getExperience(experienceId);
    if (!exp) return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
    const village = getVillage(exp.villageId);
    if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 });

    const split = {
      host: amount * 0.70,
      community: amount * 0.15,
      culture: amount * 0.10,
      platform: amount * 0.05
    };

    const cwsDelta = Math.round(amount * 0.3);
    const points = Math.floor(10 + (100 - village.cws) * 0.5);

    return NextResponse.json({
      bookingId: 'bkg_' + Math.random().toString(36).slice(2, 8),
      split,
      cwsDelta,
      points,
      villageName: village.name,
      hostName: exp.hostId // We'll resolve this on the client
    });
  } catch (error) {
    console.error('Booking API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
