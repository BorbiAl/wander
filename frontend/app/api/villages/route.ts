import { NextResponse } from 'next/server';
import { VILLAGES } from '@/app/lib/data';

export async function GET() {
  return NextResponse.json(VILLAGES);
}
