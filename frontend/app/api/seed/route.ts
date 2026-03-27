import { NextResponse } from 'next/server';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Allow up to 60s for this route — it may need two sequential Gemini calls
// (village generation + experience generation) for unknown countries.
export const maxDuration = 60;

type HubCoords = { lat: number; lng: number; country?: string };

type SourceVillage = {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lng: number;
  settlement_type?: string;
  traditions?: string[];
  [key: string]: unknown;
};

type SourceExperience = {
  id?: string;
  villageId?: string;
  village_id?: string;
  title?: string;
  name?: string;
  type?: string;
  price_eur?: number;
  duration_h?: number;
  description?: string;
  personality_weights?: [number, number, number, number, number] | number[];
  hostId?: string;
  host_id?: string;
  host_name?: string;
  host_bio?: string;
  host_rating?: number;
  country?: string;
  isFree?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  spotsTotal?: number;
  spotsRemaining?: number;
  [key: string]: unknown;
};

type SeedHost = {
  id: string;
  village_id: string;
  name: string;
  bio: string;
  rating: number;
  experienceIds: string[];
};

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SEARCH_RADIUS_KM = 150;
const MAX_VILLAGES = 5;
const MAX_EXPERIENCES_PER_VILLAGE = 6;
const EXPERIENCE_TYPES = ['craft', 'hike', 'homestay', 'ceremony', 'cooking', 'volunteer', 'folklore', 'sightseeing'] as const;

function parseLocation(raw: string): { city: string; country: string } {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: raw.trim(), country: '' };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toFiniteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeHostRating(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 4.6;
  return Math.max(3.5, Math.min(5, num));
}

function getVillageId(exp: SourceExperience): string {
  return String(exp.villageId ?? exp.village_id ?? '');
}

function getHostId(exp: SourceExperience): string {
  return String(exp.hostId ?? exp.host_id ?? '');
}

function getExperienceId(exp: SourceExperience): string {
  return String(exp.id ?? '');
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    await access(filePath);
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadFirstNonEmptyArray(paths: string[]): Promise<unknown[]> {
  for (const p of paths) {
    const data = await readJsonArray(p);
    if (data.length > 0) return data;
  }
  return [];
}

async function loadVillagesFromJson(): Promise<SourceVillage[]> {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'data', 'villages.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'villages.json'),
  ];

  const data = await loadFirstNonEmptyArray(candidates);
  return data.filter((v): v is SourceVillage => {
    if (!v || typeof v !== 'object') return false;
    const rec = v as Record<string, unknown>;
    return typeof rec.id === 'string'
      && typeof rec.name === 'string'
      && Number.isFinite(Number(rec.lat))
      && Number.isFinite(Number(rec.lng));
  });
}

async function loadExperiencesFromJson(): Promise<SourceExperience[]> {
  const checkpointNames = [25, 20, 15, 10, 5].map((n) => `checkpoint_${n}_experiences.json`);

  const candidates = [
    path.resolve(process.cwd(), 'data', 'experiences.json'),
    ...checkpointNames.map((f) => path.resolve(process.cwd(), 'data', f)),
    path.resolve(process.cwd(), '..', 'data', 'experiences.json'),
    ...checkpointNames.map((f) => path.resolve(process.cwd(), '..', 'data', f)),
    path.resolve(process.cwd(), 'engine', 'data', 'experiences.json'),
    ...checkpointNames.map((f) => path.resolve(process.cwd(), 'engine', 'data', f)),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'experiences.json'),
    ...checkpointNames.map((f) => path.resolve(process.cwd(), '..', 'engine', 'data', f)),
  ];

  const data = await loadFirstNonEmptyArray(candidates);
  return data.filter((e): e is SourceExperience => e !== null && typeof e === 'object');
}

function getCanonicalExperiencePaths(): string[] {
  return [
    path.resolve(process.cwd(), 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'data', 'experiences.json'),
    path.resolve(process.cwd(), 'engine', 'data', 'experiences.json'),
    path.resolve(process.cwd(), '..', 'engine', 'data', 'experiences.json'),
  ];
}

async function persistGeneratedExperiences(generated: SourceExperience[]): Promise<number> {
  if (generated.length === 0) return 0;

  const uniquePaths = Array.from(new Set(getCanonicalExperiencePaths()));
  let addedTotal = 0;

  for (const filePath of uniquePaths) {
    try {
      const currentRaw = await readJsonArray(filePath);
      const current = currentRaw.filter((e): e is SourceExperience => e !== null && typeof e === 'object');

      const byId = new Map<string, SourceExperience>();
      for (const e of current) {
        const id = getExperienceId(e);
        if (!id) continue;
        byId.set(id, e);
      }

      let added = 0;
      for (const e of generated) {
        const id = getExperienceId(e);
        if (!id || byId.has(id)) continue;
        byId.set(id, e);
        added += 1;
      }

      if (added === 0 && current.length > 0) {
        continue;
      }

      const merged = Array.from(byId.values());
      await writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
      addedTotal += added;
    } catch {
      // Skip non-writable paths and continue.
    }
  }

  return addedTotal;
}

async function geocodeHub(city: string, country?: string): Promise<HubCoords | null> {
  const query = country?.trim() ? `${city}, ${country}` : city;
  const q = encodeURIComponent(query);
  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&addressdetails=1&limit=1&q=${q}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Wander/1.0',
      'Accept-Language': 'en',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; address?: { country?: string } }>;
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = toFiniteNumber(data[0].lat);
  const lng = toFiniteNumber(data[0].lon);
  if (lat === null || lng === null) return null;

  const geoCountry = String(data[0].address?.country ?? '').trim();
  return { lat, lng, country: geoCountry };
}

function pickVillages(villages: SourceVillage[], center: HubCoords | null, requestedCountry: string): SourceVillage[] {
  const isEligibleType = (v: SourceVillage) => {
    const t = String(v.settlement_type ?? 'village');
    return t === 'village' || t === 'hamlet' || t === 'isolated_dwelling';
  };

  const country = requestedCountry.trim() || String(center?.country ?? '').trim();

  let scoped = villages.filter((v) => isEligibleType(v) && (!country || String(v.country ?? '').trim() === country));

  if (scoped.length === 0) {
    if (country) {
      return [];
    }
    scoped = villages.filter(isEligibleType);
  }

  if (!center) {
    return scoped.slice(0, MAX_VILLAGES);
  }

  const withDistance = scoped
    .map((v) => ({ v, d: haversineKm(center.lat, center.lng, v.lat, v.lng) }))
    .sort((a, b) => a.d - b.d);

  const inRadius = withDistance.filter((x) => x.d <= SEARCH_RADIUS_KM).map((x) => x.v);
  if (inRadius.length > 0) return inRadius.slice(0, MAX_VILLAGES);

  return withDistance.slice(0, MAX_VILLAGES).map((x) => x.v);
}

function pickExperiences(
  experiences: SourceExperience[],
  villages: SourceVillage[],
): SourceExperience[] {
  const villageIds = new Set(villages.map((v) => v.id));
  const matched = experiences.filter((e) => villageIds.has(getVillageId(e)));

  const dedup = new Map<string, SourceExperience>();
  for (const e of matched) {
    const id = getExperienceId(e);
    if (!id) continue;
    dedup.set(id, e);
  }

  return Array.from(dedup.values());
}

function sanitizeGeminiExperiences(
  rawExperiences: unknown,
  villages: SourceVillage[],
  country: string,
): SourceExperience[] {
  if (!Array.isArray(rawExperiences)) return [];

  const villageIds = new Set(villages.map((v) => v.id));
  const normalized: SourceExperience[] = [];
  const seen = new Set<string>();

  for (const item of rawExperiences) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const villageId = String(r.village_id ?? r.villageId ?? '');
    if (!villageIds.has(villageId)) continue;

    const id = String(r.id ?? `gen-${villageId}-${normalized.length + 1}`);
    if (seen.has(id)) continue;
    seen.add(id);

    const typeRaw = String(r.type ?? 'craft').toLowerCase();
    const type = EXPERIENCE_TYPES.includes(typeRaw as (typeof EXPERIENCE_TYPES)[number]) ? typeRaw : 'craft';
    const pwRaw = Array.isArray(r.personality_weights) ? r.personality_weights.slice(0, 5) : [0.2, 0.2, 0.2, 0.2, 0.2];
    const pw = pwRaw.map((n) => Number(n));
    while (pw.length < 5) pw.push(0.2);

    const priceEur = (type === 'sightseeing' || type === 'volunteer')
      ? Math.max(0, Number(r.price_eur ?? 0) || 0)
      : Math.max(5, Number(r.price_eur ?? 25) || 25);
    const isFree = Boolean(r.isFree ?? (priceEur === 0 && (type === 'sightseeing' || type === 'volunteer')));
    normalized.push({
      id,
      village_id: villageId,
      title: String(r.title ?? r.name ?? 'Village Experience'),
      type,
      price_eur: priceEur,
      duration_h: Math.max(1, Number(r.duration_h ?? 3) || 3),
      description: String(r.description ?? 'A community-led local activity.'),
      personality_weights: [pw[0], pw[1], pw[2], pw[3], pw[4]] as [number, number, number, number, number],
      host_id: String(r.host_id ?? `host-${villageId}`),
      host_name: String(r.host_name ?? 'Local Host'),
      host_bio: String(r.host_bio ?? 'Community host.'),
      host_rating: Number(r.host_rating ?? 4.6),
      country,
      isFree,
      isActive: Boolean(r.isActive ?? false),
      startDate: r.startDate as string | undefined,
      endDate: r.endDate as string | undefined,
      spotsTotal: r.spotsTotal !== undefined ? Number(r.spotsTotal) : undefined,
      spotsRemaining: r.spotsRemaining !== undefined ? Number(r.spotsRemaining) : undefined,
    });
  }

  return normalized;
}

async function generateVillagesWithGemini(
  city: string,
  country: string,
  center: HubCoords,
): Promise<SourceVillage[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey });

    const prompt = [
      'Return JSON only. No markdown and no prose.',
      `Generate exactly ${MAX_VILLAGES} real, named villages near ${city}, ${country}.`,
      'Each village must be a real place with authentic cultural character.',
      'Return an array of objects with these exact fields:',
      '  id (string, snake_case: countrycode_villagename e.g. "bt_punakha"),',
      '  name (string, local village name in English),',
      '  country (string, exact country name),',
      '  lat (number), lng (number),',
      '  region (string, province or district name),',
      '  settlement_type ("village"),',
      '  population (integer estimate),',
      '  cws (integer 20-80, community wellbeing score),',
      '  description (string, 1-2 sentences about the village character and what makes it special),',
      '  traditions (array of 2-4 short strings naming local cultural practices),',
      '  nearby (empty array [])',
      `Center coordinates: lat=${center.lat}, lng=${center.lng}. Villages should be within 200km.`,
    ].join('\n');

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = (response.text ?? '').trim();
    if (!text) return [];

    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((v): v is SourceVillage => {
      if (!v || typeof v !== 'object') return false;
      const r = v as Record<string, unknown>;
      return typeof r.id === 'string'
        && typeof r.name === 'string'
        && Number.isFinite(Number(r.lat))
        && Number.isFinite(Number(r.lng));
    }).slice(0, MAX_VILLAGES);
  } catch {
    return [];
  }
}

async function persistGeneratedVillages(generated: SourceVillage[]): Promise<void> {
  if (generated.length === 0) return;

  const candidates = [
    path.resolve(process.cwd(), 'data', 'villages.json'),
    path.resolve(process.cwd(), '..', 'data', 'villages.json'),
  ];

  for (const filePath of candidates) {
    try {
      const current = await readJsonArray(filePath) as SourceVillage[];
      const byId = new Map(current.map((v) => [v.id, v]));
      for (const v of generated) {
        if (!byId.has(v.id)) byId.set(v.id, v);
      }
      await writeFile(filePath, `${JSON.stringify(Array.from(byId.values()), null, 2)}\n`, 'utf-8');
      return;
    } catch {
      // try next path
    }
  }
}

async function generateExperiencesWithGemini(
  villages: SourceVillage[],
  city: string,
  country: string,
): Promise<SourceExperience[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || villages.length === 0) return [];

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    const villageBrief = villages.map((v) => ({
      id: v.id,
      name: v.name,
      country: v.country,
      lat: v.lat,
      lng: v.lng,
      traditions: Array.isArray(v.traditions) ? v.traditions : [],
    }));

    const prompt = [
      'Return JSON only. No markdown and no prose.',
      'Generate realistic local experiences for these exact villages.',
      `Country: ${country || 'Unknown'}. Nearby city: ${city}.`,
      `Generate up to ${MAX_EXPERIENCES_PER_VILLAGE} experiences per village.`,
      `Allowed types: ${EXPERIENCE_TYPES.join(', ')}.`,
      'REQUIRED: every village must have at least one experience of EACH of these three categories:',
      '  1. A bookable activity (type: craft, hike, homestay, ceremony, cooking, or folklore)',
      '  2. A free sightseeing landmark (type: sightseeing, price_eur: 0, isFree: true) — a real viewpoint, temple, monument, historic site, or public square in that village',
      '  3. An active volunteering event (type: volunteer, isActive: true, startDate: ISO date within the next 3 months, endDate: ISO date, spotsTotal: 4-20, spotsRemaining: 1 to spotsTotal, price_eur: 0)',
      'Each item must include: id, village_id, title, type, price_eur, duration_h, description, personality_weights, host_id, host_name, host_bio, host_rating.',
      'Use village_id exactly from the provided list. personality_weights must be 5 numbers summing to 1.0.',
      'Make descriptions specific to the actual culture, geography, and traditions of the country and village.',
      JSON.stringify(villageBrief),
    ].join('\n');

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = (response.text ?? '').trim();
    if (!text) return [];

    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return sanitizeGeminiExperiences(parsed, villages, country);
  } catch {
    return [];
  }
}

function buildHosts(experiences: SourceExperience[], villages: SourceVillage[]): SeedHost[] {
  const villageById = new Map(villages.map((v) => [v.id, v]));
  const hostMap = new Map<string, SeedHost>();

  for (const exp of experiences) {
    const expId = getExperienceId(exp);
    const villageId = getVillageId(exp);
    if (!expId || !villageId) continue;

    const fallbackHostId = `host-${villageId}`;
    const hostId = getHostId(exp) || fallbackHostId;
    const villageName = villageById.get(villageId)?.name ?? 'Village';

    if (!hostMap.has(hostId)) {
      hostMap.set(hostId, {
        id: hostId,
        village_id: villageId,
        name: String(exp.host_name ?? `Local Host ${villageName}`),
        bio: String(exp.host_bio ?? `Community host in ${villageName}.`),
        rating: normalizeHostRating(exp.host_rating),
        experienceIds: [],
      });
    }

    const host = hostMap.get(hostId)!;
    if (!host.experienceIds.includes(expId)) {
      host.experienceIds.push(expId);
    }
  }

  return Array.from(hostMap.values());
}

function collectTraditions(villages: SourceVillage[]): string[] {
  const s = new Set<string>();
  for (const v of villages) {
    const traditions = Array.isArray(v.traditions) ? v.traditions : [];
    for (const t of traditions) {
      if (typeof t === 'string' && t.trim()) s.add(t.trim());
    }
  }
  return Array.from(s).slice(0, 8);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');
  const allowGenerate = searchParams.get('allowGenerate') === '1';

  if (!location?.trim()) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 });
  }

  const { city, country: requestedCountry } = parseLocation(location);

  try {
    const [[villagesData, experiencesData], center] = await Promise.all([
      Promise.all([loadVillagesFromJson(), loadExperiencesFromJson()]),
      geocodeHub(city, requestedCountry).catch(() => null),
    ]);

    if (villagesData.length === 0) {
      return NextResponse.json({ error: 'No villages available in JSON data' }, { status: 404 });
    }

    let selectedVillages = pickVillages(villagesData, center, requestedCountry);
    const effectiveCountry = requestedCountry || String(center?.country ?? selectedVillages[0]?.country ?? '');

    // No villages in our dataset for this country — generate them with Gemini
    if (selectedVillages.length === 0 && allowGenerate && center) {
      const generatedVillages = await generateVillagesWithGemini(city, effectiveCountry || requestedCountry, center);
      if (generatedVillages.length > 0) {
        selectedVillages = generatedVillages;
        // Persist in background — don't block the response
        persistGeneratedVillages(generatedVillages).catch(() => {});
      }
    }

    if (selectedVillages.length === 0) {
      return NextResponse.json(
        { error: `No villages available for ${effectiveCountry || city}. Try again with allowGenerate=1.` },
        { status: 404 },
      );
    }

    let selectedExperiences = pickExperiences(experiencesData, selectedVillages);
    let decision = 'Loaded villages and experiences from local JSON datasets.';

    if (selectedExperiences.length === 0 && allowGenerate) {
      const generated = await generateExperiencesWithGemini(selectedVillages, city, effectiveCountry);
      if (generated.length > 0) {
        selectedExperiences = generated;
        // Persist in background — don't block the response
        persistGeneratedExperiences(generated).catch(() => {});
        decision = `Generated villages and experiences for ${effectiveCountry} with gemini-2.5-flash.`;
      }
    }

    if (selectedExperiences.length === 0 && !allowGenerate) {
      decision = 'Loaded villages from local JSON datasets, but no matching experiences were found in JSON for the selected region.';
    }

    const hosts = buildHosts(selectedExperiences, selectedVillages);

    return NextResponse.json({
      location,
      city,
      country: effectiveCountry,
      traditions: collectTraditions(selectedVillages),
      decision,
      villages: selectedVillages,
      experiences: selectedExperiences,
      hosts,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
