// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Cron Cleanup Route
// GET /api/cron/cleanup — runs weekly (Sunday 02:00 UTC)
// Purges: fairnessLogs > 90 days, webhookEvents > 30 days
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { now } from '../../../../lib/utils/index';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'] ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Production:
  // await db.delete(fairnessLogs).where(lt(fairnessLogs.createdAt, cutoff90d));
  // await db.delete(webhookEvents).where(lt(webhookEvents.receivedAt, cutoff30d));
  // await db.delete(agentExecutions).where(lt(agentExecutions.createdAt, cutoff90d));

  return NextResponse.json({
    cron:    'cleanup',
    ranAt:   now(),
    cutoffs: { fairnessLogs: cutoff90d, webhookEvents: cutoff30d, agentExecutions: cutoff90d },
    note:    'Uncomment DB delete statements for production',
  });
}
