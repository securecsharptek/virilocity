// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Signup Route
// POST /api/auth/signup — email-based account creation
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { uid, now } from '../../../../lib/utils/index';
import type { Tier, TenantModel } from '../../../../lib/types/index';
import { TIER_LIMITS } from '../../../../lib/types/index';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const formData = await req.formData();
  const email     = formData.get('email')    as string | null;
  const fullName  = formData.get('fullName') as string | null;
  const tier      = (formData.get('tier')    as Tier   | null) ?? 'free';
  const model     = (formData.get('model')   as TenantModel | null) ?? 'b2c';
  const orgName   = formData.get('orgName')  as string | null;

  if (!email || !fullName) {
    return NextResponse.json({ error: 'email and fullName required' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (model === 'b2b' && !orgName) {
    return NextResponse.json({ error: 'orgName required for B2B signup' }, { status: 400 });
  }

  const tenantId = uid('tenant');
  const userId   = uid('user');

  // Production:
  // 1. INSERT INTO users (id, email, name, provider='email')
  // 2. INSERT INTO tenants (id, name, tier, model, status, ownerId)
  // 3. If model='b2b': INSERT INTO orgs, INSERT INTO orgMembers (owner)
  // 4. If tier !== 'free': redirect to Stripe checkout
  // 5. Send welcome email via Resend

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';

  if (tier !== 'free') {
    // Redirect to Stripe checkout for paid tiers
    return NextResponse.redirect(
      `${appUrl}/api/billing/checkout?tier=${tier}&model=${model}`,
      { status: 302 },
    );
  }

  // Free tier: go straight to dashboard
  return NextResponse.redirect(`${appUrl}/dashboard?signup=success&tier=${tier}`, { status: 302 });
}
