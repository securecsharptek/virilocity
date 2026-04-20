// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Org Create Route
// POST /api/org/create — B2B org creation (Pro tier+)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { TIER_LIMITS } from '../../../../lib/types/index';
import { uid, now } from '../../../../lib/utils/index';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [status, body] = authErrorToHttp(auth.error);
    return NextResponse.json(body, { status });
  }
  const { tenant } = auth.ctx;

  // Tier gate: B2B org requires Pro+
  if (!TIER_LIMITS[tenant.tier].b2bOrg) {
    return NextResponse.json(
      { error: 'B2B organization requires Pro tier or above', upgradeUrl: '/auth/signup?tier=pro&model=b2b' },
      { status: 403 },
    );
  }

  const { name, slug } = await req.json() as { name?: string; slug?: string };
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });

  // Validate slug (lowercase alphanumeric + hyphens)
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    return NextResponse.json({ error: 'slug must be 3-50 lowercase alphanumeric characters or hyphens' }, { status: 400 });
  }

  const orgId = uid('org');
  // Production: INSERT INTO orgs (id, name, slug, tier, status) VALUES (...)
  //             INSERT INTO orgMembers (id, orgId, userId, role) VALUES (orgId, ctx.userId, 'owner')

  return NextResponse.json({
    org: { id: orgId, name, slug, tier: tenant.tier, status: 'active', createdAt: now() },
    member: { role: 'owner', userId: auth.ctx.userId ?? '' },
    seats: TIER_LIMITS[tenant.tier].seats,
  }, { status: 201 });
}
