// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — HubSpot OAuth Callback
// GET /api/hubspot/callback
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { HubSpotAuth } from '../../../../lib/integrations/hubspot';
import { setSecret }   from '../../../../lib/auth/keyvault';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code    = searchParams.get('code');
  const state   = searchParams.get('state');
  const error   = searchParams.get('error');
  const appUrl  = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';

  const parseState = (raw: string | null): { tenantId: string; returnTo: string; includeContentScope: boolean } | null => {
    if (!raw) return null;

    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { tenantId?: string; returnTo?: string; includeContentScope?: boolean };
      if (!parsed.tenantId) return null;
      const returnTo = parsed.returnTo && parsed.returnTo.startsWith('/') ? parsed.returnTo : '/dashboard';
      return { tenantId: parsed.tenantId, returnTo, includeContentScope: parsed.includeContentScope === true };
    } catch {
      // Backward compatibility for legacy state format (tenantId only)
      return { tenantId: raw, returnTo: '/dashboard', includeContentScope: false };
    }
  };

  const oauthState = parseState(state);
  const redirectTo = (hubspotStatus: 'connected' | 'error', reason?: string): NextResponse => {
    const destination = new URL(oauthState?.returnTo ?? '/dashboard', appUrl);
    destination.searchParams.set('hubspot', hubspotStatus);
    if (reason) destination.searchParams.set('reason', reason);
    return NextResponse.redirect(destination.toString());
  };

  if (error) {
    const errorDescription = searchParams.get('error_description') ?? '';
    const mismatchDetected = /scope|mismatch|configured scopes/i.test(`${error} ${errorDescription}`);

    if (mismatchDetected) {
      const reason = oauthState?.includeContentScope
        ? 'scope_mismatch_content_not_enabled_in_hubspot_app'
        : 'scope_mismatch_hubspot_app_scopes';
      return redirectTo('error', reason);
    }

    return redirectTo('error', error);
  }
  if (!code || !oauthState?.tenantId) {
    return redirectTo('error', 'missing_code');
  }

  try {
    const tokens = await HubSpotAuth.exchangeCode(code);
    // Store tokens in Key Vault — never in DB or env
    await setSecret(`hubspot-access-${oauthState.tenantId}`,  tokens.accessToken);
    await setSecret(`hubspot-refresh-${oauthState.tenantId}`, tokens.refreshToken);
    return redirectTo('connected');
  } catch (e) {
    return redirectTo('error', String(e));
  }
}
