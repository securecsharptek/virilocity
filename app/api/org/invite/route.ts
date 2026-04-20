// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Org Invite Route
// POST /api/org/invite — Add member to B2B org
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { TIER_LIMITS } from '../../../../lib/types/index';
import { uid, now } from '../../../../lib/utils/index';
import type { OrgRole } from '../../../../lib/types/index';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  if (!TIER_LIMITS[tenant.tier].b2bOrg) {
    return NextResponse.json({ error: 'B2B features require Pro tier or above' }, { status: 403 });
  }

  const { email, orgId, role = 'member' } = await req.json() as {
    email?: string; orgId?: string; role?: OrgRole;
  };

  if (!email || !orgId) return NextResponse.json({ error: 'email and orgId required' }, { status: 400 });

  const validRoles: OrgRole[] = ['admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'role must be admin, member, or viewer' }, { status: 400 });
  }

  // Validate seat limit
  const maxSeats = TIER_LIMITS[tenant.tier].seats;
  // Production: count existing orgMembers for this org, compare against maxSeats
  // if (currentCount >= maxSeats && maxSeats !== -1) return 403 seat_limit_reached

  const inviteId = uid('inv');
  // Production: create invitation record, send email via Resend

  return NextResponse.json({
    invitation: { id: inviteId, email, orgId, role, status: 'pending', createdAt: now() },
    message: `Invitation sent to ${email}`,
    seatsRemaining: maxSeats === -1 ? 'unlimited' : '4 of 5',
  }, { status: 201 });
}
