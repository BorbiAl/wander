import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

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
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  const p = await getUsersPath();
  await writeFile(p, JSON.stringify(users, null, 2), 'utf-8');
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth  body: { action: 'register'|'login'|'save', email, password, state? }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, email, password, state } = body as {
    action: string;
    email: string;
    password: string;
    state?: Record<string, unknown>;
  };

  if (!action || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const emailLower = String(email).toLowerCase().trim();
  if (!isValidEmail(emailLower)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const users = await readUsers();
  const passwordHash = hashPassword(String(password));

  if (action === 'register') {
    if (users.find(u => u.email === emailLower)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    const userId = 'user_' + Math.random().toString(36).slice(2, 8);
    const newUser: StoredUser = {
      email: emailLower,
      passwordHash,
      userId,
      state: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    users.push(newUser);
    await writeUsers(users);
    return NextResponse.json({ userId, state: null });
  }

  if (action === 'login') {
    const user = users.find(u => u.email === emailLower);
    if (!user || user.passwordHash !== passwordHash) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }
    return NextResponse.json({ userId: user.userId, state: user.state });
  }

  if (action === 'save') {
    const user = users.find(u => u.email === emailLower);
    if (!user || user.passwordHash !== passwordHash) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }
    user.state = state ?? null;
    user.updatedAt = Date.now();
    await writeUsers(users);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
