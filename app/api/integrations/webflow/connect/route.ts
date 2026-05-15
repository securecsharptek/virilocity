import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  buildWebflowAuthUrl,
  createWebflowOauthCookiePayload,
  serializeWebflowOauthCookie,
  WEBFLOW_OAUTH_COOKIE,
} from '@/lib/integrations/webflow';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const tenantFromQuery = searchParams.get('tenantId');
  const tenantId = (session as { tenantId?: string } | null)?.tenantId ?? tenantFromQuery;
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

  if (!tenantId) {
    return NextResponse.redirect(`${appUrl}/dashboard?webflow=error&reason=missing_tenant`);
  }

  try {
    const payload = createWebflowOauthCookiePayload(tenantId, searchParams.get('returnTo'));
    const response = NextResponse.redirect(buildWebflowAuthUrl(payload.nonce));
    response.cookies.set({
      name: WEBFLOW_OAUTH_COOKIE,
      value: serializeWebflowOauthCookie(payload),
      httpOnly: true,
      sameSite: 'lax',
      secure: appUrl.startsWith('https://'),
      path: '/',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'webflow_auth_failed';
    return NextResponse.redirect(`${appUrl}/dashboard?webflow=error&reason=${encodeURIComponent(reason)}`);
  }
}
