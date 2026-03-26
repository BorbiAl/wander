import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const PROMPT = (location: string) => `Generate rural travel JSON for WanderGraph. Location: "${location}". Reply with ONLY valid JSON, no markdown.

{"location":"${location}","villages":[{"id":"snake_id","name":"Village","lat":0.0,"lng":0.0,"region":"Region","cws":35,"population":200,"description":"1 vivid sentence.","nearby":["other_id"]}],"experiences":[{"id":"exp_id","village_id":"snake_id","title":"Title","type":"craft|hike|homestay|ceremony|cooking|volunteer|folklore","price_eur":30,"duration_h":3,"description":"1-2 sentences, first-person.","personality_weights":[0.2,0.2,0.2,0.2,0.2],"host_id":"host_id","impact_split":{"host":0.70,"community":0.15,"culture":0.10,"platform":0.05}}],"hosts":[{"id":"host_id","village_id":"snake_id","name":"Name","bio":"1 sentence.","rating":4.8,"experienceIds":["exp_id"]}]}

Rules: exactly 3 villages, 2 experiences each (6 total), 1 host per experience. Real GPS for "${location}". personality_weights sum to 1.0. cws 20-75.`.trim();

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
      model: 'gemini-2.0-flash',
      contents: PROMPT(location),
      config: { temperature: 0.5 },
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
