import { NextResponse } from 'next/server';
import { VERSION } from '../../../lib/types/index';
export const runtime = 'edge';
export function GET() {
  return NextResponse.json({ status: 'ok', version: VERSION, m365: true, ts: new Date().toISOString() });
}
