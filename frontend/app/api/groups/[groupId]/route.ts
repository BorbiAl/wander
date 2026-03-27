import { NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from '@/app/lib/fileLock';

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'groups.json'),
  path.resolve(process.cwd(), '..', 'data', 'groups.json'),
];

const GROUP_ID_RE = /^grp_[a-z0-9]{6,20}$/;
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

// GET /api/groups/[groupId] — fetch single group (used for polling)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  if (!GROUP_ID_RE.test(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }
  const groups = await readGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(group);
}

// PATCH /api/groups/[groupId] — join group or update destination
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  if (!GROUP_ID_RE.test(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let body: { member?: unknown; destination?: unknown; eventsBefore?: unknown; eventsAfter?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate destination length if provided
  if (body.destination !== undefined) {
    const dest = String(body.destination);
    if (dest.length > MAX_DESTINATION_LENGTH) {
      return NextResponse.json(
        { error: `destination must be at most ${MAX_DESTINATION_LENGTH} characters` },
        { status: 400 },
      );
    }
  }

  // Validate member shape if provided
  if (body.member !== undefined && !isValidMember(body.member)) {
    return NextResponse.json({ error: 'Invalid member object' }, { status: 400 });
  }

  try {
    const updated = await withFileLock('groups', async () => {
      const groups = await readGroups();
      const idx = groups.findIndex(g => g.id === groupId);
      if (idx === -1) return null;

      const group = groups[idx];

      if (body.member && isValidMember(body.member)) {
        const m = body.member;
        const safeDisplayName = m.displayName.slice(0, MAX_DISPLAY_NAME_LENGTH);
        const existingIdx = group.members.findIndex(x => x.userId === m.userId);
        if (existingIdx >= 0) {
          group.members[existingIdx] = { ...m, displayName: safeDisplayName, joinedAt: group.members[existingIdx].joinedAt };
        } else {
          group.members.push({ ...m, displayName: safeDisplayName, joinedAt: Date.now() });
        }
      }

      if (typeof body.destination === 'string') {
        group.destination = body.destination.trim();
      }
      if (Array.isArray(body.eventsBefore)) {
        group.eventsBefore = (body.eventsBefore as unknown[]).filter((e): e is string => typeof e === 'string');
      }
      if (Array.isArray(body.eventsAfter)) {
        group.eventsAfter = (body.eventsAfter as unknown[]).filter((e): e is string => typeof e === 'string');
      }

      await writeGroups(groups);
      return group;
    });

    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[groups/[groupId]] PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId] — disband group
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  if (!GROUP_ID_RE.test(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }
  try {
    await withFileLock('groups', async () => {
      const groups = await readGroups();
      await writeGroups(groups.filter(g => g.id !== groupId));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[groups/[groupId]] DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
