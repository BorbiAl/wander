import { NextResponse } from 'next/server';
import { EXPERIENCES } from '@/app/lib/data';

type HubCoords = { lat: number; lng: number };
type OsmVillage = { id: string; name: string; lat: number; lng: number };

type SeedVillage = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
  cws: number;
  population: number;
  description: string;
  nearby: string[];
};

type SeedExperience = {
  id: string;
  village_id: string;
  title: string;
  type: 'craft' | 'hike' | 'homestay' | 'ceremony' | 'cooking' | 'volunteer' | 'folklore';
  price_eur: number;
  duration_h: number;
  description: string;
  personality_weights: [number, number, number, number, number];
  host_id: string;
  impact_split: { host: number; community: number; culture: number; platform: number };
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

const COUNTRY_TRADITIONS: Record<string, string[]> = {
  Bulgaria: ['folk singing', 'wood carving', 'seasonal village feasts'],
  Romania: ['painted crafts', 'carpathian shepherding', 'harvest rituals'],
  Albania: ['polyphonic songs', 'mountain hospitality', 'stone-house cooking'],
  'Bosnia and Herzegovina': ['coffee rituals', 'sevdah music', 'handwoven textiles'],
  'North Macedonia': ['circle dances', 'pepper preserves', 'village icon painting'],
  Serbia: ['slava gatherings', 'rakija distilling', 'tamburica music'],
  Montenegro: ['highland dairying', 'epic singing', 'smoked-meat traditions'],
  Moldova: ['wine-cellar culture', 'folk embroidery', 'harvest songs'],
  Ukraine: ['egg painting', 'bandura music', 'wooden church heritage'],
  Georgia: ['polyphonic choirs', 'qvevri wine craft', 'supra hosting'],
  Turkey: ['village tea culture', 'kilim weaving', 'bazaar handicrafts'],
  Lebanon: ['olive harvest meals', 'dabke dance', 'mountain preserves'],
  Jordan: ['bedouin coffee', 'desert weaving', 'village bread ovens'],
  Nepal: ['mountain homestays', 'prayer-flag craft', 'festival drumming'],
  Bhutan: ['dzong festivals', 'mask dances', 'traditional weaving'],
  Myanmar: ['lacquerware craft', 'monastery festivals', 'tea-leaf traditions'],
  Laos: ['sticky-rice rituals', 'silk weaving', 'river festivals'],
  Vietnam: ['rice terrace farming', 'bamboo craft', 'village ancestor rites'],
  Morocco: ['argan craft', 'souk weaving', 'gnawa rhythms'],
  Tunisia: ['olive oil pressing', 'ceramic craft', 'desert storytelling'],
  Ethiopia: ['coffee ceremony', 'injera baking', 'highland market songs'],
  Tanzania: ['maasai beadwork', 'drum circles', 'village farming collectives'],
  Senegal: ['sabar drumming', 'fishing cooperatives', 'dyeing workshops'],
  Mali: ['griot storytelling', 'mud architecture craft', 'market rhythms'],
  Peru: ['andean weaving', 'potato terrace farming', 'pan flute music'],
  Bolivia: ['weaving circles', 'highland festivals', 'community farming'],
  Ecuador: ['otavalo textiles', 'andean food craft', 'village processions'],
  Colombia: ['coffee finca culture', 'vallenato songs', 'artisan markets'],
  Paraguay: ['harp traditions', 'lace embroidery', 'rural asado feasts'],
  Guatemala: ['mayan weaving', 'corn rituals', 'village marimba music'],
  Mexico: ['mole cooking', 'day-of-dead craft', 'village pottery'],
  Canada: ['indigenous craft stories', 'maple traditions', 'community harvests'],
  Fiji: ['kava ceremony', 'mat weaving', 'reef village feasts'],
  'Papua New Guinea': ['sing-sing dances', 'carved masks', 'clan storytelling'],
};

const EXPERIENCE_TYPES: SeedExperience['type'][] = [
  'craft',
  'hike',
  'homestay',
  'ceremony',
  'cooking',
  'volunteer',
  'folklore',
];

function parseLocation(raw: string): { city: string; country: string } {
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: raw.trim(), country: 'Bulgaria' };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function seededScore(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min + 1));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeHub(city: string, country: string): Promise<HubCoords | null> {
  const q = encodeURIComponent(`${city}, ${country}`);
  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=1&q=${q}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'WanderGraph/1.0',
      'Accept-Language': 'en',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getCountryCode(country: string): string {
  const map: Record<string, string> = {
    Bulgaria: 'bg', Romania: 'ro', Albania: 'al', 'Bosnia and Herzegovina': 'ba', 'North Macedonia': 'mk',
    Serbia: 'rs', Montenegro: 'me', Moldova: 'md', Ukraine: 'ua', Georgia: 'ge', Turkey: 'tr', Lebanon: 'lb',
    Jordan: 'jo', Nepal: 'np', Bhutan: 'bt', Myanmar: 'mm', Laos: 'la', Vietnam: 'vn', Morocco: 'ma',
    Tunisia: 'tn', Ethiopia: 'et', Tanzania: 'tz', Senegal: 'sn', Mali: 'ml', Peru: 'pe', Bolivia: 'bo',
    Ecuador: 'ec', Colombia: 'co', Paraguay: 'py', Guatemala: 'gt', Mexico: 'mx', Canada: 'ca', Fiji: 'fj',
    'Papua New Guinea': 'pg',
  };
  return map[country] ?? '';
}

async function fetchNearbyVillagesByNominatim(lat: number, lng: number, country: string): Promise<OsmVillage[]> {
  const km = 120;
  const latDelta = km / 111;
  const lngDelta = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const west = lng - lngDelta;
  const east = lng + lngDelta;
  const south = lat - latDelta;
  const north = lat + latDelta;
  const countryCode = getCountryCode(country);

  const unique = new Map<string, OsmVillage>();
  const terms = ['village', 'hamlet'];

  for (const term of terms) {
    try {
      const params = new URLSearchParams({
        q: term,
        format: 'jsonv2',
        addressdetails: '1',
        bounded: '1',
        viewbox: `${west},${north},${east},${south}`,
        limit: '40',
      });
      if (countryCode) params.set('countrycodes', countryCode);

      const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
        headers: {
          'User-Agent': 'WanderGraph/1.0',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;

      const rows = (await res.json()) as Array<{
        place_id?: number;
        osm_id?: number;
        lat?: string;
        lon?: string;
        type?: string;
        name?: string;
        display_name?: string;
        address?: Record<string, string>;
      }>;

      for (const row of rows) {
        const type = row.type ?? '';
        if (!['village', 'hamlet', 'isolated_dwelling'].includes(type)) continue;
        const latNum = Number(row.lat);
        const lngNum = Number(row.lon);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;

        const name = row.address?.village
          ?? row.address?.hamlet
          ?? row.name
          ?? row.display_name?.split(',')[0]
          ?? '';
        if (!name.trim()) continue;

        const id = `osm-${row.osm_id ?? row.place_id ?? `${name}-${latNum}`}`;
        if (!unique.has(id)) {
          unique.set(id, { id, name: name.trim(), lat: latNum, lng: lngNum });
        }
      }
    } catch {
      // Continue with other term
    }
  }

  return Array.from(unique.values()).slice(0, 10);
}

function buildSeedPayload(city: string, country: string, villages: OsmVillage[]) {
  const traditions = COUNTRY_TRADITIONS[country] ?? ['folk craft', 'village festivals', 'local cuisine'];

  const seedVillages: SeedVillage[] = villages.slice(0, 5).map((v) => ({
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    country,
    region: `${country} rural belt`,
    cws: seededScore(`${country}-${v.name}`, 28, 74),
    population: seededScore(`${v.name}-population`, 120, 2800),
    description: `${v.name} sits near ${city} with living traditions in ${traditions.slice(0, 2).join(' and ')}.`,
    nearby: [],
  }));

  for (const village of seedVillages) {
    const nearest = seedVillages
      .filter((other) => other.id !== village.id)
      .sort((a, b) => haversineKm(village.lat, village.lng, a.lat, a.lng) - haversineKm(village.lat, village.lng, b.lat, b.lng))
      .slice(0, 3)
      .map((n) => n.id);
    village.nearby = nearest;
  }

  const seedExperiences: SeedExperience[] = [];
  const seedHosts: SeedHost[] = [];

  for (const village of seedVillages) {
    for (let i = 0; i < 2; i += 1) {
      const type = EXPERIENCE_TYPES[(seededScore(`${village.id}-${i}`, 0, EXPERIENCE_TYPES.length - 1))];
      const tradition = traditions[(i + seededScore(village.id, 0, traditions.length - 1)) % traditions.length];
      const expId = `exp-${slug(village.id)}-${i + 1}`;
      const hostId = `host-${slug(village.id)}-${i + 1}`;

      const baseTemplate = EXPERIENCES.find((e) => e.type === type);
      const title = baseTemplate
        ? `${baseTemplate.name} · ${village.name}`
        : `${tradition} in ${village.name}`;

      seedExperiences.push({
        id: expId,
        village_id: village.id,
        title,
        type,
        price_eur: seededScore(`${expId}-price`, 18, 95),
        duration_h: seededScore(`${expId}-duration`, 2, 8),
        description: `Explore ${village.name} through ${tradition}. This activity is curated around local pace, hosts, and community craft.`,
        personality_weights: [0.2, 0.2, 0.2, 0.2, 0.2],
        host_id: hostId,
        impact_split: { host: 0.7, community: 0.15, culture: 0.1, platform: 0.05 },
      });

      seedHosts.push({
        id: hostId,
        village_id: village.id,
        name: `Local Host ${village.name}`,
        bio: `Community host in ${village.name}, preserving ${tradition}.`,
        rating: 4.7,
        experienceIds: [expId],
      });
    }
  }

  return {
    location: `${city}, ${country}`,
    city,
    country,
    traditions,
    decision: 'Nearby villages loaded from OpenStreetMap; onboarding can now personalize what happens next.',
    villages: seedVillages,
    experiences: seedExperiences,
    hosts: seedHosts,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  if (!location?.trim()) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 });
  }

  const { city, country } = parseLocation(location);

  try {
    const center = await geocodeHub(city, country);
    if (!center) {
      return NextResponse.json({ error: `Unable to locate hub for ${city}, ${country}` }, { status: 404 });
    }

    const villages = await fetchNearbyVillagesByNominatim(center.lat, center.lng, country);

    if (villages.length === 0) {
      return NextResponse.json({ error: `No nearby villages found for ${city}, ${country}` }, { status: 404 });
    }

    return NextResponse.json(buildSeedPayload(city, country, villages));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
