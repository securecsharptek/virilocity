// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Billing Plans Route
// GET /api/billing/plans
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { PRICES, GOMEGA_REF, TIER_LIMITS } from '../../../../lib/types/index';

export const runtime = 'edge';

export async function GET() {
  const savings = {
    starter:    Math.round((1 - PRICES.starter.monthly / GOMEGA_REF.full) * 100),
    pro:        Math.round((1 - PRICES.pro.monthly / GOMEGA_REF.full) * 100),
    growth:     Math.round((1 - PRICES.growth.monthly / GOMEGA_REF.full) * 100),
    scale:      Math.round((1 - PRICES.scale.monthly / GOMEGA_REF.full) * 100),
  };

  return NextResponse.json({
    prices:     PRICES,
    limits:     TIER_LIMITS,
    gomegaRef:  GOMEGA_REF,
    savings,
    platform:   'vercel-multicloud',
    b2bEnabled: true,
    b2cEnabled: true,
  });
}
