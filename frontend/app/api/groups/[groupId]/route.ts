import { NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATHS = [
  path.resolve(process.cwd(), 'data', 'groups.json'),
  path.resolve(process.cwd(), '..', 'data', 'groups.json'),
];

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
    return JSON.parse(raw);
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
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const groups = await readGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(group);
}

// PATCH /api/groups/[groupId] — join group or update destination
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  try {
    const body = await req.json() as {
      member?: StoredMember;
      destination?: string;
      eventsBefore?: string[];
      eventsAfter?: string[];
    };
    const groups = await readGroups();
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const group = groups[idx];

    if (body.member) {
      // Add or replace member (same userId = update)
      const existingIdx = group.members.findIndex(m => m.userId === body.member!.userId);
      if (existingIdx >= 0) {
        group.members[existingIdx] = { ...body.member, joinedAt: group.members[existingIdx].joinedAt };
      } else {
        group.members.push({ ...body.member, joinedAt: Date.now() });
      }
    }

    if (body.destination !== undefined) {
      group.destination = body.destination;
    }

    if (body.eventsBefore !== undefined) {
      group.eventsBefore = body.eventsBefore;
    }
    if (body.eventsAfter !== undefined) {
      group.eventsAfter = body.eventsAfter;
    }

    await writeGroups(groups);
    return NextResponse.json(group);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId] — disband group
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const groups = await readGroups();
  const filtered = groups.filter(g => g.id !== groupId);
  await writeGroups(filtered);
  return NextResponse.json({ ok: true });
}
