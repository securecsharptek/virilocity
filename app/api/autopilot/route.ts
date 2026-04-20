// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Autopilot Run Route
// POST /api/autopilot — trigger full 11-task autopilot cycle
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../lib/auth/middleware';
import { runAutopilot } from '../../../lib/agents/autopilot';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro: 60s max for autopilot cycles

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  const result = await runAutopilot(tenant);
  return NextResponse.json(result);
}
