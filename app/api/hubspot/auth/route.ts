// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — HubSpot Auth Route
// GET /api/hubspot/auth — initiates OAuth2 flow
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { HubSpotAuth } from '../../../../lib/integrations/hubspot';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const url = HubSpotAuth.getAuthUrl(auth.ctx.tenantId);
  return NextResponse.redirect(url);
}
