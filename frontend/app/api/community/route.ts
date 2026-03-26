import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export type CommunityExperience = {
  title: string;
  type: 'craft' | 'hike' | 'homestay' | 'ceremony' | 'cooking' | 'volunteer' | 'folklore';
  description: string;
  price_eur: number;
  personality_weights: [number, number, number, number, number];
  host_hint: string; // e.g. "a local grandmother", "a retired forester"
  source_url: string;
  subreddit: string;
};

const SUBREDDITS = ['solotravel', 'travel', 'digitalnomad', 'backpacking', 'offthebeatenpath'];

async function fetchRedditPosts(villageName: string): Promise<{ title: string; body: string; url: string; subreddit: string }[]> {
  const posts: { title: string; body: string; url: string; subreddit: string }[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(villageName)}&limit=5&sort=relevance&t=all`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WanderGraph/1.0 (hackathon project)' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const children = data?.data?.children ?? [];
      for (const child of children) {
        const p = child.data;
        if (!p.title) continue;
        posts.push({
          title: p.title,
          body: (p.selftext ?? '').slice(0, 400),
          url: `https://reddit.com${p.permalink}`,
          subreddit: sub,
        });
      }
    } catch {
      // skip this subreddit on timeout/error
    }
    if (posts.length >= 10) break;
  }

  return posts;
}

const GEMINI_PROMPT = (village: string, posts: { title: string; body: string; url: string; subreddit: string }[]) => `
You are extracting travel experience ideas for the village of "${village}" from real Reddit traveler posts.

Reddit posts:
${posts.map((p, i) => `[${i + 1}] r/${p.subreddit} — "${p.title}"\n${p.body}`).join('\n\n')}

Based on these posts, extract up to 3 distinct authentic travel experiences someone could have in ${village}.
If the posts mention nothing specific, invent plausible culturally authentic experiences based on what you know about ${village}.

Return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "title": "short experience title",
    "type": one of ["craft","hike","homestay","ceremony","cooking","volunteer","folklore"],
    "description": "2-3 sentences. Vivid, specific, first-person feel. No generic tourism language.",
    "price_eur": integer between 0 and 80,
    "personality_weights": [explorer, connector, restorer, achiever, guardian] — 5 floats summing to 1.0,
    "host_hint": "e.g. a retired schoolteacher, a fourth-generation farmer",
    "source_url": "url of the reddit post that inspired this, or empty string",
    "subreddit": "subreddit name or empty string"
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
