// app/api/health/live/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET() {
  return NextResponse.json({ status: 'ok', ts: new Date().toISOString() });
}
