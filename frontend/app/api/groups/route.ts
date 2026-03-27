import { NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from '@/app/lib/fileLock';

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'groups.json'),
  path.resolve(process.cwd(), '..', 'data', 'groups.json'),
];

const MAX_NAME_LENGTH = 80;
const MAX_DESTINATION_LENGTH = 100;
const MAX_DISPLAY_NAME_LENGTH = 60;

type StoredMember = {
  userId: string;
  displayName: string;
  vector: [number, number, number, number, number];
  dominant: string;
  joinedAt: number;
};

type StoredGroup = {
  id: string;
  name: string;
  members: StoredMember[];
  destination: string;
  createdAt: number;
  eventsBefore: string[];
  eventsAfter: string[];
};

function isValidMember(m: unknown): m is StoredMember {
  if (!m || typeof m !== 'object') return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.userId === 'string' && r.userId.length > 0 && r.userId.length <= 32 &&
    typeof r.displayName === 'string' &&
    Array.isArray(r.vector) && r.vector.length === 5 &&
    (r.vector as unknown[]).every(v => typeof v === 'number' && Number.isFinite(v)) &&
    typeof r.dominant === 'string'
  );
}

async function getGroupsPath(): Promise<string> {
  for (const p of DATA_PATHS) {
    try { await access(path.dirname(p)); return p; } catch { /* try next */ }
  }
  return DATA_PATHS[0];
}

async function readGroups(): Promise<StoredGroup[]> {
  const filePath = await getGroupsPath();
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as StoredGroup[];
  } catch {
    return [];
  }
}

async function writeGroups(groups: StoredGroup[]): Promise<void> {
  const filePath = await getGroupsPath();
  await writeFile(filePath, JSON.stringify(groups, null, 2), 'utf-8');
}

// GET /api/groups — list all groups (for polling)
export async function GET() {
  const groups = await readGroups();
  return NextResponse.json(groups);
}

// POST /api/groups — create a new group
export async function POST(req: Request) {
  let body: { name?: unknown; destination?: unknown; creator?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `name must be at most ${MAX_NAME_LENGTH} characters` }, { status: 400 });
  }
  if (destination.length > MAX_DESTINATION_LENGTH) {
    return NextResponse.json({ error: `destination must be at most ${MAX_DESTINATION_LENGTH} characters` }, { status: 400 });
  }
  if (!isValidMember(body.creator)) {
    return NextResponse.json({ error: 'Valid creator member is required' }, { status: 400 });
  }

  const creator = body.creator as StoredMember;
  const safeDisplayName = creator.displayName.slice(0, MAX_DISPLAY_NAME_LENGTH);

  try {
    const newGroup = await withFileLock('groups', async () => {
      const groups = await readGroups();
      const group: StoredGroup = {
        id: 'grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name,
        destination,
        members: [{ ...creator, displayName: safeDisplayName, joinedAt: Date.now() }],
        createdAt: Date.now(),
        eventsBefore: [],
        eventsAfter: [],
      };
      groups.push(group);
      await writeGroups(groups);
      return group;
    });
    return NextResponse.json(newGroup);
  } catch (e) {
    console.error('[groups] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
