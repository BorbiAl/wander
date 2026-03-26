import { NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

// Stored in /data/groups.json alongside villages.json and experiences.json
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

// GET /api/groups — list all groups (for polling)
export async function GET() {
  const groups = await readGroups();
  return NextResponse.json(groups);
}

// POST /api/groups — create a new group
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      name: string;
      destination: string;
      creator: StoredMember;
    };
    if (!body.name || !body.creator?.userId) {
      return NextResponse.json({ error: 'name and creator required' }, { status: 400 });
    }
    const groups = await readGroups();
    const newGroup: StoredGroup = {
      id: 'grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: body.name,
      destination: body.destination ?? '',
      members: [{ ...body.creator, joinedAt: Date.now() }],
      createdAt: Date.now(),
    };
    groups.push(newGroup);
    await writeGroups(groups);
    return NextResponse.json(newGroup);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
