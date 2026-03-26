import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'users.json'),
  path.resolve(process.cwd(), '..', 'data', 'users.json'),
];

type StoredUser = {
  email: string;
  passwordHash: string;
  userId: string;
  state: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
  eventsBefore: string[];
  eventsAfter: string[];
};

function extractEventsFromState(state: Record<string, unknown> | null): { eventsBefore: string[]; eventsAfter: string[] } {
  if (!state) return { eventsBefore: [], eventsAfter: [] };

  const bookingsUnknown = state.bookings;
  if (!Array.isArray(bookingsUnknown)) {
    return { eventsBefore: [], eventsAfter: [] };
  }

  const eventsBefore: string[] = [];
  const eventsAfter: string[] = [];

  for (const booking of bookingsUnknown) {
    if (!booking || typeof booking !== 'object') continue;
    const record = booking as Record<string, unknown>;

    if (Array.isArray(record.eventsBefore)) {
      for (const event of record.eventsBefore) {
        if (typeof event === 'string' && event.trim()) eventsBefore.push(event);
      }
    }
    if (Array.isArray(record.eventsAfter)) {
      for (const event of record.eventsAfter) {
        if (typeof event === 'string' && event.trim()) eventsAfter.push(event);
      }
    }

    if ((!Array.isArray(record.eventsBefore) || !Array.isArray(record.eventsAfter)) && typeof record.scheduledAt === 'string') {
      const dateMs = Date.parse(record.scheduledAt);
      if (!Number.isNaN(dateMs)) {
        if (dateMs < Date.now()) eventsBefore.push(record.scheduledAt);
        else eventsAfter.push(record.scheduledAt);
      }
    }
  }

  return { eventsBefore, eventsAfter };
}

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
    const users = JSON.parse(raw) as StoredUser[];
    return users.map(u => ({
      eventsBefore: [],
      eventsAfter: [],
      ...u,
    }));
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  const p = await getUsersPath();
  await writeFile(p, JSON.stringify(users, null, 2), 'utf-8');
}

// GET /api/auth?email=...&userId=... -> current user's before/after events from users.json
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('email') || '').toLowerCase().trim();
  const userId = (req.nextUrl.searchParams.get('userId') || '').trim();

  if (!email || !userId) {
    return NextResponse.json({ error: 'Missing email or userId' }, { status: 400 });
  }

  const users = await readUsers();
  const user = users.find((u) => u.email === email && u.userId === userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    eventsBefore: user.eventsBefore ?? [],
    eventsAfter: user.eventsAfter ?? [],
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth  body: { action: 'save'|'autosave', email, userId, state? }
// Login/register is now handled by /api/auth/otp (email OTP flow).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, email, userId, state } = body as {
    action: string;
    email: string;
    userId: string;
    state?: Record<string, unknown>;
  };

  if (!action || !email || !userId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const emailLower = String(email).toLowerCase().trim();
  if (!isValidEmail(emailLower)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const users = await readUsers();

  if (action === 'save' || action === 'autosave') {
    const user = users.find(u => u.email === emailLower && u.userId === String(userId));
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const nextState = state ?? null;
    user.state = nextState;
    const extracted = extractEventsFromState(nextState);
    user.eventsBefore = extracted.eventsBefore;
    user.eventsAfter = extracted.eventsAfter;
    user.updatedAt = Date.now();
    await writeUsers(users);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
