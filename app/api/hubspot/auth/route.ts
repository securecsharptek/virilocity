// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — HubSpot Auth Route
// GET /api/hubspot/auth — initiates OAuth2 flow
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { HubSpotAuth } from '../../../../lib/integrations/hubspot';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const tenantFromQuery = searchParams.get('tenantId');
  const returnToParam = searchParams.get('returnTo');
  const includeContentScopeParam = (searchParams.get('includeContentScope') ?? '').toLowerCase();
  const includeContentScope = includeContentScopeParam === '1' || includeContentScopeParam === 'true';
  const tenantId = (session as { tenantId?: string } | null)?.tenantId ?? tenantFromQuery;

  if (!tenantId) {
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=missing_tenant`);
  }

  const returnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : '/dashboard';
  const statePayload = Buffer.from(JSON.stringify({ tenantId, returnTo, includeContentScope }), 'utf8').toString('base64url');

  const url = HubSpotAuth.getAuthUrl(statePayload, { includeContentScope });
  return NextResponse.redirect(url);
}
