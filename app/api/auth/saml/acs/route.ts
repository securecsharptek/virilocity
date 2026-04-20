// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML ACS Route
// POST /api/auth/saml/acs
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
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
    // Production: create/update user session, set auth cookie
    return NextResponse.redirect(assertion.redirectTo);
  } catch (e) {
    return NextResponse.json({ error: `SAML assertion failed: ${String(e)}` }, { status: 400 });
  }
}
