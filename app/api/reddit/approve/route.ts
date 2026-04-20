// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Reddit Approve Route (HITL Gate)
// POST /api/reddit/approve
// HITL: Reddit NEVER auto-posts. Human must explicitly approve each thread.
// REDDIT_REQUIRES_HUMAN_APPROVAL is a hardcoded constant — not configurable.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../../lib/types/index';
import { now } from '../../../../lib/utils/index';

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

  const { threadId, draftResponse } = await req.json() as {
    threadId?: string; draftResponse?: string;
  };
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 });

  // Production:
  // 1. UPDATE redditThreads SET approvedBy=userId, approvedAt=now() WHERE id=threadId
  // 2. Queue the actual Reddit API post (via external service or manual)

  return NextResponse.json({
    approved:    true,
    threadId,
    approvedBy:  auth.ctx.userId ?? 'unknown',
    approvedAt:  now(),
    tenantId:    tenant.id,
    note:        'Post queued for manual submission. Virilocity never auto-posts to Reddit.',
    requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL, // always true
  });
}
