import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'users.json'),
  path.resolve(process.cwd(), '..', 'data', 'users.json'),
];

type StoredUser = {
  email: string;
  userId: string;
  state: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
};

type PersonalityVector = [number, number, number, number, number];

async function getUsersPath(): Promise<string> {
  for (const p of DATA_PATHS) {
    try { await access(path.dirname(p)); return p; } catch { /* try next */ }
  }
  return DATA_PATHS[0];
}

async function readUsers(): Promise<StoredUser[]> {
  const p = await getUsersPath();
  try {
    const raw = await readFile(p, 'utf-8');
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function dotProduct(a: PersonalityVector, b: PersonalityVector): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function personalityCompatibility(a: PersonalityVector, b: PersonalityVector): number {
  // Same dot-product similarity used elsewhere in the app, scaled to 0-1
  return Math.min(1, dotProduct(a, b) * 3.5);
}

// GET /api/users/suggest?userId=...&vector=...
// Returns top personality-matched users (excluding self and already-added friends)
// vector param: comma-separated 5 floats representing the requester's personality vector
export async function GET(req: NextRequest) {
  const userId = (req.nextUrl.searchParams.get('userId') || '').trim();
  const vectorParam = req.nextUrl.searchParams.get('vector') || '';

  if (!userId || !vectorParam) {
    return NextResponse.json({ error: 'Missing userId or vector' }, { status: 400 });
  }

  const vectorParts = vectorParam.split(',').map(Number);
  if (vectorParts.length !== 5 || vectorParts.some(isNaN)) {
    return NextResponse.json({ error: 'Invalid vector format' }, { status: 400 });
  }
  const myVector = vectorParts as PersonalityVector;

  const users = await readUsers();

  type Suggestion = {
    userId: string;
    displayName: string;
    dominant: string;
    vector: PersonalityVector;
    compatibility: number;
  };

  const suggestions: Suggestion[] = [];

  for (const user of users) {
    if (user.userId === userId) continue;
    if (!user.state) continue;

    const personality = user.state.personality as { vector?: PersonalityVector; dominant?: string } | null;
    if (!personality?.vector || !personality?.dominant) continue;

    const theirVector = personality.vector;
    if (!Array.isArray(theirVector) || theirVector.length !== 5) continue;

    const compatibility = personalityCompatibility(myVector, theirVector as PersonalityVector);

    suggestions.push({
      userId: user.userId,
      displayName: `Traveler #${user.userId.slice(-4)}`,
      dominant: personality.dominant,
      vector: theirVector as PersonalityVector,
      compatibility,
    });
  }

  // Sort by compatibility descending, return top 10
  suggestions.sort((a, b) => b.compatibility - a.compatibility);
  return NextResponse.json(suggestions.slice(0, 10));
}
