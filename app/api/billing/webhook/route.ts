// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Stripe Billing Webhook  ·  TEVV FIX: F-02
// POST /api/billing/webhook
// Fixes: stripe.webhooks.constructEvent() used (built-in ±300s replay guard)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook } from '../../../../lib/webhook/verify';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

// IMPORTANT: Raw body required for Stripe signature verification
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody  = await req.text();
  const sig      = req.headers.get('stripe-signature') ?? '';
  const secret   = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // TEVV F-02 FIX: constructEvent validates timestamp within ±300s natively
    event = verifyStripeWebhook(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${String(e)}` },
      { status: 400 },
    );
  }

  // Process event type
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(inv);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  const tenantId = session.metadata?.['tenantId'];
  const tier     = session.metadata?.['tier'];
  if (!tenantId || !tier) return;
  // Production: update tenant tier in Neon Postgres via Drizzle
  console.info('Checkout completed', { tenantId, tier });
};

const handleSubscriptionDeleted = async (sub: Stripe.Subscription): Promise<void> => {
  const tenantId = sub.metadata?.['tenantId'];
  if (!tenantId) return;
  // Production: downgrade tenant to free tier
  console.info('Subscription cancelled', { tenantId });
};

const handlePaymentFailed = async (inv: Stripe.Invoice): Promise<void> => {
  const customerId = inv.customer as string;
  console.warn('Payment failed', { customerId });
};
