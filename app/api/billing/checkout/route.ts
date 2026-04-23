// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Billing Checkout Route
// POST /api/billing/checkout
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { PRICES, TIER_LIMITS } from '../../../../lib/types/index';

export const runtime = 'nodejs';

const getStripe = () => {
  const apiKey = process.env['STRIPE_SECRET_KEY'];
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(apiKey, { apiVersion: '2025-02-24.acacia' });
};

const STRIPE_PRICES: Record<string, { monthly: string; annual: string }> = {
  starter: { monthly: process.env['STRIPE_PRICE_STARTER_MONTHLY'] ?? 'price_starter_monthly', annual: process.env['STRIPE_PRICE_STARTER_ANNUAL'] ?? 'price_starter_annual' },
  pro:     { monthly: process.env['STRIPE_PRICE_PRO_MONTHLY']     ?? 'price_pro_monthly',     annual: process.env['STRIPE_PRICE_PRO_ANNUAL']     ?? 'price_pro_annual'     },
  growth:  { monthly: process.env['STRIPE_PRICE_GROWTH_MONTHLY']  ?? 'price_growth_monthly',  annual: process.env['STRIPE_PRICE_GROWTH_ANNUAL']  ?? 'price_growth_annual'  },
  scale:   { monthly: process.env['STRIPE_PRICE_SCALE_MONTHLY']   ?? 'price_scale_monthly',   annual: process.env['STRIPE_PRICE_SCALE_ANNUAL']   ?? 'price_scale_annual'   },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [status, body] = authErrorToHttp(auth.error);
    return NextResponse.json(body, { status });
  }
  const { tenant } = auth.ctx;

  const { tier, cycle = 'monthly', model = 'b2c' } = await req.json() as { tier?: string; cycle?: string; model?: string };
  if (!tier || !STRIPE_PRICES[tier]) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });

  const priceId  = STRIPE_PRICES[tier]![cycle === 'annual' ? 'annual' : 'monthly'];
  const appUrl   = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
  const limits   = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode:               'subscription',
    payment_method_types: ['card'],
    line_items:         [{ price: priceId, quantity: 1 }],
    success_url:        `${appUrl}/dashboard?checkout=success&tier=${tier}`,
    cancel_url:         `${appUrl}/#${model === 'b2b' ? 'b2b' : 'b2c'}-section`,
    metadata: {
      tenantId: tenant.id,
      tier,
      cycle,
      model,
      seats: String(limits?.seats ?? 1),
    },
    subscription_data: { metadata: { tenantId: tenant.id, tier, model } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
