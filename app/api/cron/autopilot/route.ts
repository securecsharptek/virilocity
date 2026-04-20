// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Cron Autopilot Route
// GET /api/cron/autopilot — Vercel Cron (daily at 06:00 UTC)
// Secured with CRON_SECRET header
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { now } from '../../../../lib/utils/index';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 300; // 5 min budget for all tenants

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Vercel Cron authentication
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'] ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();

  // Production: fetch all active tenants from DB, run autopilot for each
  // const tenants = await db.select().from(tenants).where(eq(tenants.status, 'active'));
  // const results = await Promise.allSettled(tenants.map(t => runAutopilot(t)));

  // Mock response for scaffold
  return NextResponse.json({
    cron:      'autopilot',
    startedAt: now(),
    tenantsProcessed: 0,
    durationMs: Date.now() - startMs,
    note: 'Connect DB and uncomment tenant loop for production',
  });
}
