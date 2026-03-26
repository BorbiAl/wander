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
    user.state = state ?? null;
    user.updatedAt = Date.now();
    await writeUsers(users);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
