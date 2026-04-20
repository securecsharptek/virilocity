// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML SSO Routes (Enterprise tier only)
// GET  /api/auth/saml/login  — initiate SP-initiated SAML flow
// POST /api/auth/saml/acs    — Assertion Consumer Service
// POST /api/auth/saml/logout — Single Logout
// GET  /saml/metadata/:tenantId — SP metadata XML
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../../lib/auth/middleware';
import { generateAuthnRequest, parseSAMLResponse, generateLogoutRequest } from '../../../../../lib/m365/saml.sso';
import { TIER_LIMITS } from '../../../../../lib/types/index';

export const runtime = 'nodejs';

// GET /api/auth/saml/login
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  if (!TIER_LIMITS[tenant.tier].samlSso) {
    return NextResponse.json(
      { error: 'SAML SSO requires Enterprise tier', upgradeUrl: '/auth/signup?tier=enterprise' },
      { status: 403 },
    );
  }

  const { redirectUrl } = await generateAuthnRequest(tenant.id, '/dashboard');
  return NextResponse.redirect(redirectUrl);
}
