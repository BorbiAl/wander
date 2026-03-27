import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
// nodemailer 8 ships its own CJS types that don't resolve cleanly under
// moduleResolution:"bundler". We require() it and declare only what we use.
type MailTransporter = { sendMail(opts: MailOptions): Promise<unknown> };
type MailOptions = { from?: string; to: string; subject: string; text: string; html: string };
type TransportConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: { user?: string; pass?: string };
  tls?: { servername?: string };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as { createTransport(cfg: TransportConfig): MailTransporter };
import { checkRateLimit } from '@/app/lib/rateLimit';
import { withFileLock } from '@/app/lib/fileLock';

// ---------------------------------------------------------------------------
// OTP store (in-memory + persisted to otp.json for restarts)
// OTPs are stored as SHA-256(code + ':' + email) — never in plaintext.
// ---------------------------------------------------------------------------

type OtpEntry = {
  hash: string;  // SHA-256 hex of `${code}:${email}`
  expiresAt: number; // unix ms
};

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'otp.json'),
  path.resolve(process.cwd(), '..', 'data', 'otp.json'),
];

function hashOtp(code: string, email: string): string {
  return createHash('sha256').update(`${code}:${email}`).digest('hex');
}

async function getOtpPath(): Promise<string> {
  for (const p of DATA_PATHS) {
    try { await access(path.dirname(p)); return p; } catch { /* try next */ }
  }
  return DATA_PATHS[0];
}

async function readOtpStore(): Promise<Record<string, OtpEntry>> {
  const p = await getOtpPath();
  try {
    const raw = await readFile(p, 'utf-8');
    return JSON.parse(raw) as Record<string, OtpEntry>;
  } catch {
    return {};
  }
}

async function writeOtpStore(store: Record<string, OtpEntry>): Promise<void> {
  const now = Date.now();
  const pruned: Record<string, OtpEntry> = {};
  for (const [k, v] of Object.entries(store)) {
    if (v.expiresAt > now) pruned[k] = v;
  }
  const p = await getOtpPath();
  await writeFile(p, JSON.stringify(pruned, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// User store helpers (re-use same paths as /api/auth)
// ---------------------------------------------------------------------------

const USER_PATHS = [
  path.resolve(process.cwd(), 'data', 'users.json'),
  path.resolve(process.cwd(), '..', 'data', 'users.json'),
];

type StoredUser = {
  email: string;
  userId: string;
  state: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
  eventsBefore: string[];
  eventsAfter: string[];
};

async function getUsersPath(): Promise<string> {
  for (const p of USER_PATHS) {
    try { await access(path.dirname(p)); return p; } catch { /* try next */ }
  }
  return USER_PATHS[0];
}

async function readUsers(): Promise<StoredUser[]> {
  const p = await getUsersPath();
  try {
    const raw = await readFile(p, 'utf-8');
    const users = JSON.parse(raw) as StoredUser[];
    return users.map(u => ({ ...u, eventsBefore: u.eventsBefore ?? [], eventsAfter: u.eventsAfter ?? [] }));
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  const p = await getUsersPath();
  await writeFile(p, JSON.stringify(users, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Mailer
// ---------------------------------------------------------------------------

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Some providers terminate SMTP on a branded hostname but present a
    // certificate for their backend mail cluster instead.
    tls: {
      servername: process.env.SMTP_TLS_SERVERNAME ?? process.env.SMTP_HOST,
    },
  });
}

async function sendOtpEmail(to: string, code: string): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: 'Your WanderGraph login code',
    text: `Your login code is: ${code}\n\nIt expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#0B6E2A">WanderGraph</h2>
        <p>Your login code is:</p>
        <p style="font-size:2.5rem;font-weight:bold;letter-spacing:0.25em;color:#1A2E1C">${code}</p>
        <p style="color:#666;font-size:0.85rem">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/otp
// body: { action: 'send', email } | { action: 'verify', email, code }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, email, code } = body as { action: string; email: string; code?: string };

  if (!action || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const emailLower = String(email).toLowerCase().trim();
  if (!isValidEmail(emailLower)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // ── send ──────────────────────────────────────────────────────────────────
  if (action === 'send') {
    // 5 OTP sends per email per 10 minutes — prevents spam and API cost abuse
    if (!checkRateLimit(`otp:send:${emailLower}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many code requests. Please wait before trying again.' },
        { status: 429 },
      );
    }

    const otp = generateCode();
    const otpHash = hashOtp(otp, emailLower);

    await withFileLock('otp', async () => {
      const store = await readOtpStore();
      store[emailLower] = { hash: otpHash, expiresAt: Date.now() + OTP_TTL_MS };
      await writeOtpStore(store);
    });

    try {
      await sendOtpEmail(emailLower, otp);
    } catch (err) {
      console.error('[otp] SMTP error:', err);
      return NextResponse.json({ error: 'Failed to send email — please try again' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  // ── verify ────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    // 10 verify attempts per email per 10 minutes — prevents brute-force of 6-digit codes
    if (!checkRateLimit(`otp:verify:${emailLower}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 },
      );
    }

    const store = await readOtpStore();
    const entry = store[emailLower];

    if (!entry || Date.now() > entry.expiresAt) {
      return NextResponse.json({ error: 'Code expired or not found — request a new one' }, { status: 401 });
    }

    // Timing-safe comparison: prevents timing-oracle attacks
    const submittedHash = hashOtp(String(code).trim(), emailLower);
    const storedBuf = Buffer.from(entry.hash, 'hex');
    const submittedBuf = Buffer.from(submittedHash, 'hex');
    const isValid = storedBuf.length === submittedBuf.length
      && timingSafeEqual(storedBuf, submittedBuf);

    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect code' }, { status: 401 });
    }

    // Consume the OTP so it cannot be reused
    await withFileLock('otp', async () => {
      const freshStore = await readOtpStore();
      delete freshStore[emailLower];
      await writeOtpStore(freshStore);
    });

    // Find or create user (serialised to prevent duplicate accounts)
    const result = await withFileLock('users', async () => {
      const users = await readUsers();
      let user = users.find(u => u.email === emailLower);
      let isNew = false;

      if (!user) {
        isNew = true;
        user = {
          email: emailLower,
          userId: 'user_' + Math.random().toString(36).slice(2, 8),
          state: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          eventsBefore: [],
          eventsAfter: [],
        };
        users.push(user);
        await writeUsers(users);
      }

      return { userId: user.userId, state: user.state, isNew };
    });

    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
