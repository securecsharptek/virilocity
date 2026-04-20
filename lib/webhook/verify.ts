// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Webhook Verification  ·  TEVV FIX: F-02
// Closes: Adversarial Robustness CONDITIONAL PASS (76/100) → PASS
//
// Fixes applied:
//  1. HubSpot: validates X-HubSpot-Request-Timestamp within ±300s
//  2. Stripe:  uses stripe.webhooks.constructEvent() (SDK-level replay guard)
//  3. safeCompare() constant-time HMAC (CWE-208) retained
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac, timingSafeEqual } from 'crypto';
import Stripe from 'stripe';
import { WEBHOOK_REPLAY_WINDOW_SECONDS } from '../types/index';

// ── Constant-time comparison  (CWE-208) ───────────────────────────────────────
export const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
};

// ── TEVV F-02: HubSpot webhook — timestamp + HMAC ────────────────────────────
// HubSpot Signature v3: X-HubSpot-Signature-V3 = base64(HMAC-SHA256(method+uri+body+timestamp))
// X-HubSpot-Request-Timestamp: unix ms
export interface HubSpotWebhookHeaders {
  'x-hubspot-signature-v3'?:     string;
  'x-hubspot-request-timestamp'?: string;
}

export const verifyHubSpotWebhook = (
  body:      string,
  headers:   HubSpotWebhookHeaders,
  secret:    string,
  method    = 'POST',
  uri       = '',
): { ok: boolean; reason?: string } => {
  if (!secret) return { ok: false, reason: 'missing_secret' };

  const sig       = headers['x-hubspot-signature-v3'];
  const tsHeader  = headers['x-hubspot-request-timestamp'];

  if (!sig)      return { ok: false, reason: 'missing_signature' };
  if (!tsHeader) return { ok: false, reason: 'missing_timestamp' };

  // TEVV F-02 FIX: Replay window — reject if timestamp outside ±300s
  const tsMs  = parseInt(tsHeader, 10);
  const nowMs = Date.now();
  if (isNaN(tsMs) || Math.abs(nowMs - tsMs) > WEBHOOK_REPLAY_WINDOW_SECONDS * 1000) {
    return { ok: false, reason: 'timestamp_out_of_window' };
  }

  // HubSpot v3: HMAC-SHA256 of METHOD + URI + BODY + TIMESTAMP (concatenated)
  const payload   = `${method}${uri}${body}${tsHeader}`;
  const expected  = createHmac('sha256', secret).update(payload).digest('base64');

  if (!safeCompare(expected, sig)) return { ok: false, reason: 'invalid_hmac' };
  return { ok: true };
};

// ── TEVV F-02: Stripe webhook — SDK constructEvent (built-in replay guard) ───
// stripe.webhooks.constructEvent() validates timestamp within 300s natively.
export const verifyStripeWebhook = (
  rawBody:   string | Buffer,
  signature: string,
  secret:    string,
): Stripe.Event => {
  // Throws SignatureVerificationError on replay, invalid sig, or missing timestamp
  const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', { apiVersion: '2025-02-24.acacia' });
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
};

// ── Generic HMAC-SHA256 helper (for custom webhooks) ─────────────────────────
export const computeHmacSha256 = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('hex');
