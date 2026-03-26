import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export type CommunityExperience = {
  title: string;
  type: 'craft' | 'hike' | 'homestay' | 'ceremony' | 'cooking' | 'volunteer' | 'folklore' | 'sightseeing';
  description: string;
  price_eur: number;
  personality_weights: [number, number, number, number, number];
  host_hint: string; // e.g. "a local grandmother", "a retired forester"
  source_url: string;
  subreddit: string;
};

const SUBREDDITS = [
  'solotravel', 'travel', 'backpacking', 'offthebeatenpath',
  'shoestring', 'travelhacks', 'budgettravel', 'hiking', 'digitalnomad',
];

// Multiple search queries to cast a wide net: general, free/hidden, and local tips
function buildQueries(villageName: string): string[] {
  const q = encodeURIComponent(villageName);
  return [
    `${q}`,
    `${q}+free`,
    `${q}+hidden+gems`,
    `${q}+locals+recommend`,
    `${q}+off+the+beaten+path`,
    `${q}+things+to+do`,
  ];
}

async function fetchRedditPosts(villageName: string): Promise<{ title: string; body: string; url: string; subreddit: string; score: number }[]> {
  const seen = new Set<string>();
  const posts: { title: string; body: string; url: string; subreddit: string; score: number }[] = [];
  const queries = buildQueries(villageName);

  for (const sub of SUBREDDITS) {
    for (const query of queries) {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${query}&limit=8&sort=relevance&t=all`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'WanderGraph/1.0 (hackathon project)' },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const children = data?.data?.children ?? [];
        for (const child of children) {
          const p = child.data;
          if (!p.title || seen.has(p.id)) continue;
          seen.add(p.id);
          posts.push({
            title: p.title,
            body: (p.selftext ?? '').slice(0, 800),
            url: `https://reddit.com${p.permalink}`,
            subreddit: sub,
            score: p.score ?? 0,
          });
        }
      } catch {
        // skip on timeout/error
      }
      if (posts.length >= 30) break;
    }
    if (posts.length >= 30) break;
  }

  // Sort by upvote score so Gemini sees the most trusted posts first
  posts.sort((a, b) => b.score - a.score);
  return posts.slice(0, 25);
}

const GEMINI_PROMPT = (village: string, posts: { title: string; body: string; url: string; subreddit: string; score: number }[]) => `
You are an expert travel researcher and ethnographer specialising in authentic, off-the-beaten-path experiences. Your task is to analyse a set of real Reddit posts written by travellers who visited "${village}" and distil them into a curated shortlist of genuine experiences — both paid and completely free.

## Source material
The posts below are sorted by upvote score (highest first), meaning the community has validated their usefulness. Treat high-score posts as primary evidence.

${posts.map((p, i) => `[${i + 1}] ▲${p.score} r/${p.subreddit} — "${p.title}"\n${p.body.trim()}`).join('\n\n---\n\n')}

## Your analytical task

Step 1 — EVIDENCE SCAN: Read every post carefully. Extract concrete mentions of:
  - Specific place names, streets, viewpoints, markets, trails, ruins, neighbourhoods
  - Local activities, workshops, ceremonies, food experiences
  - Anything described as free, cheap, or not in guidebooks
  - Host or guide names, community contacts, tips from locals

Step 2 — GROUNDING RULE: Every experience you output MUST be traceable to at least one post above OR be clearly grounded in well-established knowledge about "${village}" (geography, culture, history). Do NOT invent fictional places or made-up workshops.

Step 3 — DIVERSITY REQUIREMENT: Produce exactly 4 experiences with this mandatory distribution:
  - At least 2 must be FREE (price_eur: 0) — self-guided sightseeing, public viewpoints, free trails, street markets, public squares, neighbourhood walks, architectural gems, river or coastal paths, anything a traveller can do without paying
  - At least 1 must be a paid local experience (workshop, homestay, guided tour, cooking class, ceremony)
  - No two experiences should be of the same type
  - Prioritise experiences that are NOT listed in mainstream guidebooks or top-10 tourist lists

Step 4 — QUALITY BAR: Each description must be:
  - Specific and sensory — name the street, the hill, the material, the dish, the time of day
  - Written from a traveller's perspective, not a brochure's
  - Free of clichés: ban "vibrant", "bustling", "rich culture", "must-see", "hidden gem" (show don't tell)
  - 2–3 tight sentences maximum

Step 5 — PERSONALITY WEIGHTS: Assign weights [explorer, connector, restorer, achiever, guardian] that reflect who genuinely enjoys this experience. They must sum to exactly 1.0. Use the full range — not all 0.2s.

## Output format
Return ONLY a valid JSON array. No markdown fences, no explanation, no commentary before or after.

[
  {
    "title": "concise, specific title — not a generic phrase",
    "type": one of ["craft","hike","homestay","ceremony","cooking","volunteer","folklore","sightseeing"],
    "description": "2-3 sentences. Specific, sensory, first-person feel.",
    "price_eur": integer (0 for free, realistic local price for paid),
    "personality_weights": [float, float, float, float, float] summing to 1.0,
    "host_hint": "specific person descriptor if applicable, e.g. 'a third-generation weaver', or empty string for self-guided",
    "source_url": "direct URL of the Reddit post that most supports this experience, or empty string",
    "subreddit": "subreddit name of that post, or empty string"
  }
]
`.trim();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const village = searchParams.get('village');

  if (!village) {
    return NextResponse.json({ error: 'village param required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    // 1. Fetch Reddit posts
    const posts = await fetchRedditPosts(village);

    // 2. Call Gemini
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: GEMINI_PROMPT(village, posts),
    });

    const raw = result.text ?? '';

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let experiences: CommunityExperience[] = [];
    try {
      experiences = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Gemini returned unparseable JSON', raw }, { status: 500 });
    }

    return NextResponse.json({
      village,
      reddit_posts_found: posts.length,
      experiences,
    });
  } catch (err) {
    console.error('Community API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
