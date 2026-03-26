import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const PROMPT = (location: string) => `
You are generating authentic rural travel data for WanderGraph — an app that matches travelers to off-the-beaten-path villages based on personality.

Location: "${location}"

Generate data for this location in valid JSON with exactly this structure. No markdown, no explanation, just JSON:

{
  "location": "${location}",
  "villages": [
    {
      "id": "lowercase_underscore_id",
      "name": "Village Name",
      "lat": 0.0,
      "lng": 0.0,
      "region": "Region Name",
      "cws": 30,
      "population": 150,
      "description": "2 sentences. Specific, vivid, no generic tourism language.",
      "nearby": ["other_village_id"]
    }
  ],
  "experiences": [
    {
      "id": "exp_unique_id",
      "village_id": "village_id",
      "title": "Experience Title",
      "type": "one of: craft|hike|homestay|ceremony|cooking|volunteer|folklore",
      "price_eur": 25,
      "duration_h": 3,
      "description": "2-3 sentences. First-person feel. Specific details.",
      "personality_weights": [0.2, 0.2, 0.2, 0.2, 0.2],
      "host_id": "host_id",
      "impact_split": {"host": 0.70, "community": 0.15, "culture": 0.10, "platform": 0.05}
    }
  ],
  "hosts": [
    {
      "id": "host_id",
      "village_id": "village_id",
      "name": "Local Name",
      "bio": "2 sentences. Specific credential, not generic.",
      "rating": 4.8,
      "experienceIds": ["exp_id"]
    }
  ]
}

Rules:
- Generate exactly 5 villages with realistic GPS coordinates for "${location}"
- Generate 2-3 experiences per village (10-15 total)
- One host per experience minimum
- personality_weights: 5 floats [explorer, connector, restorer, achiever, guardian] summing to 1.0
- cws between 20-75 (lower = more remote/pioneer)
- All data must be culturally authentic to "${location}" — local crafts, food, traditions, landscape
- Village IDs use underscores, are lowercase, unique
- Experience IDs start with "exp_"
- Host IDs start with "host_"
- nearby arrays reference other village IDs in this dataset
`.trim();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: 'location param required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: PROMPT(location),
      config: { temperature: 0.7 },
    });

    const raw = result.text ?? '';
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Gemini returned unparseable JSON', raw }, { status: 500 });
    }

    // Validate minimum shape
    if (!data.villages?.length || !data.experiences?.length) {
      return NextResponse.json({ error: 'Gemini returned incomplete data', data }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Seed API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
