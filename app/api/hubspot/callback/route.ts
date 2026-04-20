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
  const state   = searchParams.get('state'); // tenantId
  const error   = searchParams.get('error');
  const appUrl  = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=missing_code`);
  }

  try {
    const tokens = await HubSpotAuth.exchangeCode(code);
    // Store tokens in Key Vault — never in DB or env
    await setSecret(`hubspot-access-${state}`,  tokens.accessToken);
    await setSecret(`hubspot-refresh-${state}`, tokens.refreshToken);
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=connected`);
  } catch (e) {
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=${encodeURIComponent(String(e))}`);
  }
}
