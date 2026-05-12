import { NextRequest, NextResponse } from 'next/server';
import { setSecret } from '@/lib/auth/keyvault';
import {
  exchangeShopifyCode,
  fetchShopifyBlogs,
  parseShopifyOauthCookie,
  pickPrimaryShopifyBlog,
  SHOPIFY_OAUTH_COOKIE,
  verifyShopifyCallbackHmac,
} from '@/lib/integrations/shopify';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  const oauthCookie = parseShopifyOauthCookie(req.cookies.get(SHOPIFY_OAUTH_COOKIE)?.value);

  const redirectTo = (status: 'connected' | 'error', reason?: string): NextResponse => {
    const destination = new URL(oauthCookie?.returnTo ?? '/dashboard?tab=settings&lever=cms', appUrl);
    destination.searchParams.set('shopify', status);
    if (reason) destination.searchParams.set('reason', reason);
    const response = NextResponse.redirect(destination.toString());
    response.cookies.delete(SHOPIFY_OAUTH_COOKIE);
    return response;
  };

  if (error) {
    return redirectTo('error', error);
  }

  if (!code || !shop || !state || !oauthCookie) {
    return redirectTo('error', 'missing_code');
  }

  if (state !== oauthCookie.nonce || shop !== oauthCookie.shop) {
    return redirectTo('error', 'invalid_state');
  }

  try {
    if (!verifyShopifyCallbackHmac(searchParams)) {
      return redirectTo('error', 'invalid_hmac');
    }

    const accessToken = await exchangeShopifyCode(shop, code);
    const blogs = await fetchShopifyBlogs(shop, accessToken);
    const primaryBlog = pickPrimaryShopifyBlog(blogs);

    if (!primaryBlog?.id) {
      return redirectTo('error', 'missing_blog');
    }

    await Promise.all([
      setSecret(`shopify-token-${oauthCookie.tenantId}`, accessToken),
      setSecret(`shopify-shop-${oauthCookie.tenantId}`, shop),
      setSecret(`shopify-blog-id-${oauthCookie.tenantId}`, String(primaryBlog.id)),
    ]);

    return redirectTo('connected');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'shopify_callback_failed';
    return redirectTo('error', reason);
  }
}