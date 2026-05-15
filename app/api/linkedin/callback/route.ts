// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.5 — LinkedIn OAuth Callback
// GET /api/linkedin/callback
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { LinkedInAuth } from '../../../../lib/integrations/linkedin';
import { setSecret } from '../../../../lib/auth/keyvault';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenantId
  const error = searchParams.get('error');
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?linkedin=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?linkedin=error&reason=missing_code`);
  }

  try {
    const tokens = await LinkedInAuth.exchangeCode(code);
    const memberId = await LinkedInAuth.getMemberId(tokens.accessToken);

    await setSecret(`linkedin-access-${state}`, tokens.accessToken);
    await setSecret(`linkedin-member-id-${state}`, memberId);

    return NextResponse.redirect(`${appUrl}/dashboard?linkedin=connected`);
  } catch (e) {
    const reason = encodeURIComponent(e instanceof Error ? e.message : String(e));
    return NextResponse.redirect(`${appUrl}/dashboard?linkedin=error&reason=${reason}`);
  }
}
