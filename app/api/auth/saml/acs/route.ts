// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML ACS Route
// POST /api/auth/saml/acs
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { parseSAMLResponse } from '../../../../../lib/m365/saml.sso';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const formData     = await req.formData();
  const samlResponse = formData.get('SAMLResponse') as string | null;
  const relayState   = formData.get('RelayState')   as string | null;

  if (!samlResponse) {
    return NextResponse.json({ error: 'SAMLResponse required' }, { status: 400 });
  }

  const tenantId = relayState?.split(':')[0] ?? 'unknown';

  try {
    const assertion = await parseSAMLResponse(tenantId, samlResponse, relayState ?? undefined);

    const secret = new TextEncoder().encode((process.env['AUTH_SECRET'] ?? 'dev-auth-secret').trim() || 'dev-auth-secret');
    const jwt = await new SignJWT({
      sub: assertion.nameId,
      email: assertion.email,
      tenantId,
      provider: 'saml',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const response = NextResponse.redirect(assertion.redirectTo);
    response.cookies.set('enterprise_sso', jwt, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return response;
  } catch (e) {
    return NextResponse.json({ error: `SAML assertion failed: ${String(e)}` }, { status: 400 });
  }
}
