// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Reddit Approve Route (HITL Gate)
// POST /api/reddit/approve
// HITL: Reddit NEVER auto-posts. Human must explicitly approve each thread.
// REDDIT_REQUIRES_HUMAN_APPROVAL is a hardcoded constant — not configurable.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../../lib/types/index';
import { db, redditThreads } from '../../../../lib/db/client';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  // This assertion is always true — it's a runtime contract check
  if (!REDDIT_REQUIRES_HUMAN_APPROVAL) {
    return NextResponse.json({ error: 'HITL invariant violated' }, { status: 500 });
  }

  if (!process.env['DATABASE_URL']?.trim()) {
    return NextResponse.json({ error: 'reddit queue database is not configured' }, { status: 503 });
  }

  const { threadId, draftResponse } = await req.json() as {
    threadId?: string; draftResponse?: string;
  };
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });

  const existing = await db.select().from(redditThreads)
    .where(and(eq(redditThreads.id, threadId), eq(redditThreads.tenantId, tenant.id)));
  const thread = existing[0];
  if (!thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }

  if (thread.approvedAt) {
    return NextResponse.json({ error: 'thread already approved' }, { status: 409 });
  }

  const approvedBy = auth.ctx.userId ?? 'unknown';
  const approvedAt = new Date();

  await db.update(redditThreads)
    .set({
      approvedBy,
      approvedAt,
      draftResponse: typeof draftResponse === 'string' && draftResponse.trim().length > 0
        ? draftResponse.trim()
        : thread.draftResponse,
    })
    .where(and(eq(redditThreads.id, threadId), eq(redditThreads.tenantId, tenant.id)));

  return NextResponse.json({
    approved:    true,
    threadId,
    approvedBy,
    approvedAt:  approvedAt.toISOString(),
    tenantId:    tenant.id,
    note:        'Post queued for manual submission. Virilocity never auto-posts to Reddit.',
    requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL, // always true
  });
}
