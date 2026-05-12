import crypto from 'node:crypto';
import { withRetry } from '@/lib/utils';

const DEFAULT_APP_URL = 'http://localhost:3000';
const DEFAULT_RETURN_TO = '/dashboard?tab=settings&lever=cms';
const DEFAULT_SCOPES = 'sites:read cms:read cms:write';

export const WEBFLOW_OAUTH_COOKIE = 'virilocity_webflow_oauth';

export type WebflowOauthCookiePayload = {
  nonce: string;
  tenantId: string;
  returnTo: string;
};

export type WebflowSite = {
  id: string;
  displayName: string;
};

export type WebflowCollection = {
  id: string;
  displayName: string;
  slug?: string;
};

type WebflowTokenResponse = {
  access_token?: string;
};

type WebflowSitesResponse = {
  sites?: Array<{ id?: string; displayName?: string; name?: string }>;
};

type WebflowCollectionsResponse = {
  collections?: Array<{ id?: string; displayName?: string; name?: string; slug?: string }>;
};

const getAppUrl = (): string => {
  return (process.env['NEXT_PUBLIC_APP_URL'] ?? DEFAULT_APP_URL).trim() || DEFAULT_APP_URL;
};

const getRequiredEnv = (name: 'WEBFLOW_CLIENT_ID' | 'WEBFLOW_CLIENT_SECRET'): string => {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

export const getSafeReturnPath = (value?: string | null): string => {
  if (!value || !value.startsWith('/')) return DEFAULT_RETURN_TO;
  return value;
};

export const getWebflowRedirectUri = (): string => {
  const configured = (process.env['WEBFLOW_REDIRECT_URI'] ?? '').trim();
  if (configured) return configured;
  return `${getAppUrl().replace(/\/$/, '')}/api/integrations/webflow/callback`;
};

export const getWebflowOauthScopes = (): string => {
  const scopes = (process.env['WEBFLOW_OAUTH_SCOPES'] ?? DEFAULT_SCOPES)
    .split(/[\s,]+/)
    .map(scope => scope.trim())
    .filter(Boolean);

  return scopes.join(' ');
};

export const createWebflowOauthCookiePayload = (
  tenantId: string,
  returnTo?: string | null,
): WebflowOauthCookiePayload => ({
  nonce: crypto.randomUUID(),
  tenantId,
  returnTo: getSafeReturnPath(returnTo),
});

export const serializeWebflowOauthCookie = (payload: WebflowOauthCookiePayload): string => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

export const parseWebflowOauthCookie = (raw?: string): WebflowOauthCookiePayload | null => {
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<WebflowOauthCookiePayload>;

    if (!parsed.nonce || !parsed.tenantId) return null;

    return {
      nonce: parsed.nonce,
      tenantId: parsed.tenantId,
      returnTo: getSafeReturnPath(parsed.returnTo),
    };
  } catch {
    return null;
  }
};

export const buildWebflowAuthUrl = (state: string): string => {
  const url = new URL('https://webflow.com/oauth/authorize');
  url.searchParams.set('client_id', getRequiredEnv('WEBFLOW_CLIENT_ID'));
  url.searchParams.set('redirect_uri', getWebflowRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', getWebflowOauthScopes());
  url.searchParams.set('state', state);
  return url.toString();
};

export const exchangeWebflowCode = async (code: string): Promise<string> => {
  const body = new URLSearchParams({
    client_id: getRequiredEnv('WEBFLOW_CLIENT_ID'),
    client_secret: getRequiredEnv('WEBFLOW_CLIENT_SECRET'),
    grant_type: 'authorization_code',
    code,
    redirect_uri: getWebflowRedirectUri(),
  });

  const response = await withRetry(async () => fetch('https://api.webflow.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  }));

  const payload = (await response.json().catch(() => ({}))) as WebflowTokenResponse;
  const token = payload.access_token?.trim() ?? '';

  if (!response.ok || !token) {
    throw new Error(`Webflow token exchange failed (${response.status})`);
  }

  return token;
};

export const fetchWebflowSites = async (token: string): Promise<WebflowSite[]> => {
  const response = await withRetry(async () => fetch('https://api.webflow.com/v2/sites', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  }));

  const payload = (await response.json().catch(() => ({}))) as WebflowSitesResponse;
  if (!response.ok) {
    throw new Error(`Webflow site discovery failed (${response.status})`);
  }

  return (payload.sites ?? [])
    .map(site => ({
      id: String(site.id ?? '').trim(),
      displayName: String(site.displayName ?? site.name ?? '').trim(),
    }))
    .filter(site => Boolean(site.id));
};

export const fetchWebflowCollections = async (
  token: string,
  siteId: string,
): Promise<WebflowCollection[]> => {
  const response = await withRetry(async () => fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(siteId)}/collections`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  }));

  const payload = (await response.json().catch(() => ({}))) as WebflowCollectionsResponse;
  if (!response.ok) {
    throw new Error(`Webflow collection discovery failed (${response.status})`);
  }

  return (payload.collections ?? [])
    .map(collection => ({
      id: String(collection.id ?? '').trim(),
      displayName: String(collection.displayName ?? collection.name ?? '').trim(),
      slug: typeof collection.slug === 'string' ? collection.slug : undefined,
    }))
    .filter(collection => Boolean(collection.id));
};

export const pickPrimaryWebflowSite = (sites: WebflowSite[]): WebflowSite | null => {
  return sites[0] ?? null;
};

export const pickPrimaryWebflowCollection = (collections: WebflowCollection[]): WebflowCollection | null => {
  if (collections.length === 0) return null;

  const blogLike = collections.find(collection => {
    const haystack = `${collection.displayName} ${collection.slug ?? ''}`.toLowerCase();
    return haystack.includes('blog') || haystack.includes('post') || haystack.includes('article');
  });

  return blogLike ?? collections[0] ?? null;
};
