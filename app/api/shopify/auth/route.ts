import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  buildShopifyAuthUrl,
  createShopifyOauthCookiePayload,
  normalizeShopifyShopDomain,
  serializeShopifyOauthCookie,
  SHOPIFY_OAUTH_COOKIE,
} from '@/lib/integrations/shopify';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const tenantFromQuery = searchParams.get('tenantId');
  const tenantId = (session as { tenantId?: string } | null)?.tenantId ?? tenantFromQuery;
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

  if (!tenantId) {
    return NextResponse.redirect(`${appUrl}/dashboard?shopify=error&reason=missing_tenant`);
  }

  const rawShop = searchParams.get('shop') ?? '';
  const returnToParam = searchParams.get('returnTo');

  let shop: string;
  try {
    shop = normalizeShopifyShopDomain(rawShop);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?shopify=error&reason=invalid_shop`);
  }

  try {
    const payload = createShopifyOauthCookiePayload(tenantId, shop, returnToParam);
    const url = buildShopifyAuthUrl(shop, payload.nonce);
    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: SHOPIFY_OAUTH_COOKIE,
      value: serializeShopifyOauthCookie(payload),
      httpOnly: true,
      sameSite: 'lax',
      secure: appUrl.startsWith('https://'),
      path: '/',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'shopify_auth_failed';
    return NextResponse.redirect(`${appUrl}/dashboard?shopify=error&reason=${encodeURIComponent(reason)}`);
  }
}