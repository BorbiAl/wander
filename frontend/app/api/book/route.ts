import { NextResponse } from 'next/server';
import { getExperience, getVillage } from '@/app/lib/utils';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

type ResolvedExperience = {
  id: string;
  villageId: string;
  hostId: string;
};

type ResolvedVillage = {
  id: string;
  name: string;
  cws: number;
};

async function readFirstJsonArray(candidatePaths: string[]): Promise<Record<string, unknown>[]> {
  for (const p of candidatePaths) {
    try {
      await access(p);
      const raw = await readFile(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    } catch {
      // Try next candidate path.
    }
  }
  return [];
}

async function resolveExperience(experienceId: string): Promise<ResolvedExperience | null> {
  const local = getExperience(experienceId);
  if (local) {
    return { id: local.id, villageId: local.villageId, hostId: local.hostId };
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'data', 'experiences.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'experiences.json'),
  ];

  const experiences = await readFirstJsonArray(candidatePaths);
  const found = experiences.find((e) => String(e.id ?? '') === experienceId);
  if (!found) return null;

  return {
    id: String(found.id ?? ''),
    villageId: String(found.village_id ?? found.villageId ?? ''),
    hostId: String(found.host_id ?? found.hostId ?? ''),
  };
}

async function resolveVillage(villageId: string): Promise<ResolvedVillage | null> {
  const local = getVillage(villageId);
  if (local) {
    return { id: local.id, name: local.name, cws: Number(local.cws ?? 50) || 50 };
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'data', 'villages.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'villages.json'),
  ];

  const villages = await readFirstJsonArray(candidatePaths);
  const found = villages.find((v) => String(v.id ?? '') === villageId);
  if (!found) return null;

  return {
    id: String(found.id ?? ''),
    name: String(found.name ?? ''),
    cws: Number(found.cws ?? 50) || 50,
  };
}

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
      const exp = await resolveExperience(experienceId);
      const village = exp ? await resolveVillage(exp.villageId) : null;
      const cws_base = Number(village?.cws ?? 50) || 50;
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
      const exp = await resolveExperience(experienceId);
      if (!exp) return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
      const village = await resolveVillage(exp.villageId);
      if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 });

      const split = {
        host: amount * 0.70,
        community: amount * 0.15,
        culture: amount * 0.10,
        platform: amount * 0.05,
      };
      const cws = Number(village.cws) || 50;
      const cwsDelta = Math.max(1, Math.round(Number(amount) * 0.3));
      const points = Math.floor(10 + (100 - cws) * 0.5);

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
