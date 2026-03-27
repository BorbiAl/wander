import { NextResponse } from 'next/server';
import { getExperience, getVillage } from '@/app/lib/utils';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

/** Maximum booking amount accepted (guards against accidental/malicious large values). */
const MAX_BOOKING_AMOUNT = 5000;
/** Minimum sensible booking amount in EUR. */
const MIN_BOOKING_AMOUNT = 1;
/** Timeout before falling back to JS computation. */
const ENGINE_TIMEOUT_MS = 1500;

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
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { experienceId, amount, userId } = body;

  // ── Input validation ────────────────────────────────────────────────────
  if (typeof experienceId !== 'string' || !experienceId.trim()) {
    return NextResponse.json({ error: 'experienceId is required' }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < MIN_BOOKING_AMOUNT || amountNum > MAX_BOOKING_AMOUNT) {
    return NextResponse.json(
      { error: `amount must be a number between ${MIN_BOOKING_AMOUNT} and ${MAX_BOOKING_AMOUNT}` },
      { status: 400 },
    );
  }

  const safeUserId = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';

  // ── Try C++ engine first ─────────────────────────────────────────────────
  try {
    const res = await fetch('http://localhost:8081/graph/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experience_id: experienceId,
        amount_eur: amountNum,
        user_id: safeUserId,
      }),
      signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const data = await res.json() as Record<string, unknown>;

    const exp = await resolveExperience(experienceId);
    const village = exp ? await resolveVillage(exp.villageId) : null;
    const cws_base = Number(village?.cws ?? 50) || 50;
    const points = 10 + Math.max(0, Math.floor((100 - cws_base) / 5));

    return NextResponse.json({
      bookingId: 'bkg_' + String(data.booking_id ?? Math.random().toString(36).slice(2, 8)),
      split: data.money_flow,
      cwsDelta: data.cws_delta,
      points,
      villageName: village?.name ?? String(data.village_id ?? ''),
      hostName: exp?.hostId ?? '',
    });
  } catch (engineErr) {
    // Expected when engine is offline; log for operational visibility.
    const reason = engineErr instanceof Error ? engineErr.message : String(engineErr);
    console.warn(`[book] C++ engine unavailable (${reason}), falling back to JS computation`);
  }

  // ── JS fallback ──────────────────────────────────────────────────────────
  try {
    const exp = await resolveExperience(experienceId);
    if (!exp) return NextResponse.json({ error: 'Experience not found' }, { status: 404 });

    const village = await resolveVillage(exp.villageId);
    if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 });

    const split = {
      host: amountNum * 0.70,
      community: amountNum * 0.15,
      culture: amountNum * 0.10,
      platform: amountNum * 0.05,
    };
    const cws = Number(village.cws) || 50;
    const cwsDelta = Math.max(1, Math.round(amountNum * 0.3));
    const points = Math.floor(10 + (100 - cws) * 0.5);

    return NextResponse.json({
      bookingId: 'bkg_' + Math.random().toString(36).slice(2, 8),
      split,
      cwsDelta,
      points,
      villageName: village.name,
      hostName: exp.hostId,
    });
  } catch (error) {
    console.error('[book] JS fallback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
