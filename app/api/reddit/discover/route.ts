// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Reddit Discover Route
// GET /api/reddit/discover?subreddits=r/marketing,r/SaaS
// Always returns requiresHumanApproval: true — no auto-posting ever
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../../lib/types/index';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const subs = (searchParams.get('subreddits') ?? 'r/marketing,r/SaaS').split(',').filter(Boolean);

  // Production: run reddit_manager agent, return discovered threads
  // Here we return the contract — threads always flagged requiresHumanApproval
  return NextResponse.json({
    threads: [],
    subreddits: subs,
    tenantId: tenant.id,
    requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL, // always true
    message: 'Discovered threads queued for human review. Use POST /api/reddit/approve to approve.',
  });
}
