// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Org Members Route
// GET /api/org/members?orgId=xxx
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { TIER_LIMITS } from '../../../../lib/types/index';

export const runtime = 'edge';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

  // Production: SELECT * FROM orgMembers WHERE orgId = ? ORDER BY joinedAt DESC
  const mockMembers = [
    { id: 'mem_001', orgId, userId: auth.ctx.userId ?? 'usr_001', role: 'owner',  email: 'owner@company.com', joinedAt: new Date().toISOString() },
    { id: 'mem_002', orgId, userId: 'usr_002', role: 'admin',  email: 'admin@company.com',  joinedAt: new Date().toISOString() },
  ];

  const limits  = TIER_LIMITS[tenant.tier];
  return NextResponse.json({
    members: mockMembers,
    count:   mockMembers.length,
    seats:   { used: mockMembers.length, total: limits.seats === -1 ? 'unlimited' : limits.seats },
  });
}
