import { NextRequest, NextResponse } from 'next/server';
import { setSecret } from '@/lib/auth/keyvault';
import {
  exchangeWebflowCode,
  fetchWebflowCollections,
  fetchWebflowSites,
  parseWebflowOauthCookie,
  pickPrimaryWebflowCollection,
  pickPrimaryWebflowSite,
  WEBFLOW_OAUTH_COOKIE,
} from '@/lib/integrations/webflow';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  const oauthCookie = parseWebflowOauthCookie(req.cookies.get(WEBFLOW_OAUTH_COOKIE)?.value);

  const redirectTo = (status: 'connected' | 'error', reason?: string): NextResponse => {
    const destination = new URL(oauthCookie?.returnTo ?? '/dashboard?tab=settings&lever=cms', appUrl);
    destination.searchParams.set('webflow', status);
    if (reason) destination.searchParams.set('reason', reason);
    const response = NextResponse.redirect(destination.toString());
    response.cookies.delete(WEBFLOW_OAUTH_COOKIE);
    return response;
  };

  if (error) return redirectTo('error', error);

  if (!code || !state || !oauthCookie) {
    return redirectTo('error', 'missing_code');
  }

  if (state !== oauthCookie.nonce) {
    return redirectTo('error', 'invalid_state');
  }

  try {
    const token = await exchangeWebflowCode(code);
    const sites = await fetchWebflowSites(token);
    const primarySite = pickPrimaryWebflowSite(sites);

    if (!primarySite?.id) {
      return redirectTo('error', 'missing_site');
    }

    const collections = await fetchWebflowCollections(token, primarySite.id);
    const primaryCollection = pickPrimaryWebflowCollection(collections);

    if (!primaryCollection?.id) {
      return redirectTo('error', 'missing_collection');
    }

    await Promise.all([
      setSecret(`webflow-token-${oauthCookie.tenantId}`, token),
      setSecret(`webflow-site-${oauthCookie.tenantId}`, primarySite.id),
      setSecret(`webflow-site-name-${oauthCookie.tenantId}`, primarySite.displayName || primarySite.id),
      setSecret(`webflow-collection-${oauthCookie.tenantId}`, primaryCollection.id),
      setSecret(`webflow-collection-name-${oauthCookie.tenantId}`, primaryCollection.displayName || primaryCollection.id),
    ]);

    return redirectTo('connected');
  } catch (caughtError) {
    const reason = caughtError instanceof Error ? caughtError.message : 'webflow_callback_failed';
    return redirectTo('error', reason);
  }
}
