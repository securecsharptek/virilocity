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
  const tenantId = (session as { tenantId?: string } | null)?.tenantId ?? tenantFromQuery;

  if (!tenantId) {
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=missing_tenant`);
  }

  const url = HubSpotAuth.getAuthUrl(tenantId);
  return NextResponse.redirect(url);
}
