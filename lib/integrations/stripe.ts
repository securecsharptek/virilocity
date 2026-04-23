// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Stripe Integration
// Billing plans · Checkout sessions · B2B seat licensing
// TEVV F-02: constructEvent() used in webhook route
// ─────────────────────────────────────────────────────────────────────────────
import Stripe      from 'stripe';
import { PRICES, GOMEGA_REF, TIER_LIMITS } from '../types/index';
import type { Tier, Cycle, TenantModel }   from '../types/index';

export const getStripe = () => {
  const apiKey = process.env['STRIPE_SECRET_KEY'];
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });
};

// ── Price ID map (set real IDs in env vars) ───────────────────────────────────
export const STRIPE_PRICES: Record<string, Record<Cycle, string>> = {
  starter: {
    monthly: process.env['STRIPE_PRICE_STARTER_MONTHLY'] ?? 'price_starter_monthly_placeholder',
    annual:  process.env['STRIPE_PRICE_STARTER_ANNUAL']  ?? 'price_starter_annual_placeholder',
  },
  pro: {
    monthly: process.env['STRIPE_PRICE_PRO_MONTHLY']     ?? 'price_pro_monthly_placeholder',
    annual:  process.env['STRIPE_PRICE_PRO_ANNUAL']      ?? 'price_pro_annual_placeholder',
  },
  growth: {
    monthly: process.env['STRIPE_PRICE_GROWTH_MONTHLY']  ?? 'price_growth_monthly_placeholder',
    annual:  process.env['STRIPE_PRICE_GROWTH_ANNUAL']   ?? 'price_growth_annual_placeholder',
  },
  scale: {
    monthly: process.env['STRIPE_PRICE_SCALE_MONTHLY']   ?? 'price_scale_monthly_placeholder',
    annual:  process.env['STRIPE_PRICE_SCALE_ANNUAL']    ?? 'price_scale_annual_placeholder',
  },
};

// ── Billing plans response ─────────────────────────────────────────────────────
export const getBillingPlans = () => {
  const savings = {
    starter:    Math.round((1 - PRICES.starter.monthly / GOMEGA_REF.full) * 100),
    pro:        Math.round((1 - PRICES.pro.monthly    / GOMEGA_REF.full) * 100),
    growth:     Math.round((1 - PRICES.growth.monthly / GOMEGA_REF.full) * 100),
    scale:      Math.round((1 - PRICES.scale.monthly  / GOMEGA_REF.full) * 100),
  };
  return { prices: PRICES, limits: TIER_LIMITS, gomegaRef: GOMEGA_REF, savings, b2bEnabled: true, b2cEnabled: true };
};

// ── Create checkout session ───────────────────────────────────────────────────
export const createCheckoutSession = async (
  tenantId:   string,
  tier:       Tier,
  cycle:      Cycle,
  model:      TenantModel,
  successUrl: string,
  cancelUrl:  string,
): Promise<string> => {
  const priceMap = STRIPE_PRICES[tier];
  if (!priceMap) throw new Error(`Unknown tier: ${tier}`);

  const limits = TIER_LIMITS[tier];
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode:                  'subscription',
    payment_method_types:  ['card'],
    line_items:            [{ price: priceMap[cycle], quantity: 1 }],
    success_url:           successUrl,
    cancel_url:            cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      tenantId,
      tier,
      cycle,
      model,
      seats: String(limits?.seats ?? 1),
    },
    subscription_data: {
      metadata: { tenantId, tier, model },
    },
  });

  if (!session.url) throw new Error('Stripe session URL missing');
  return session.url;
};

// ── Customer portal ───────────────────────────────────────────────────────────
export const createPortalSession = async (
  customerId: string,
  returnUrl:  string,
): Promise<string> => {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl,
  });
  return session.url;
};
