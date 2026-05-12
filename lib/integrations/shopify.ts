import crypto from 'node:crypto';

const DEFAULT_APP_URL = 'http://localhost:3000';
const DEFAULT_RETURN_TO = '/dashboard?tab=settings&lever=cms';
const DEFAULT_SCOPES = 'read_content,write_content';
const SHOPIFY_API_VERSION = '2024-10';

export const SHOPIFY_OAUTH_COOKIE = 'virilocity_shopify_oauth';

export type ShopifyOauthCookiePayload = {
  nonce: string;
  tenantId: string;
  shop: string;
  returnTo: string;
};

type ShopifyBlogRecord = {
  id?: number | string;
  title?: string;
  handle?: string;
};

const getAppUrl = (): string => {
  return (process.env['NEXT_PUBLIC_APP_URL'] ?? DEFAULT_APP_URL).trim() || DEFAULT_APP_URL;
};

const getRequiredEnv = (name: 'SHOPIFY_CLIENT_ID' | 'SHOPIFY_CLIENT_SECRET'): string => {
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

export const normalizeShopifyShopDomain = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/.test(normalized)) {
    throw new Error('Shopify shop must be a valid *.myshopify.com domain');
  }

  return normalized;
};

export const getShopifyRedirectUri = (): string => {
  const configured = (process.env['SHOPIFY_REDIRECT_URI'] ?? '').trim();
  if (configured) return configured;
  return `${getAppUrl().replace(/\/$/, '')}/api/shopify/callback`;
};

export const getShopifyOauthScopes = (): string => {
  const scopes = (process.env['SHOPIFY_OAUTH_SCOPES'] ?? DEFAULT_SCOPES)
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean);

  return scopes.join(',');
};

export const createShopifyOauthCookiePayload = (
  tenantId: string,
  shop: string,
  returnTo?: string | null,
): ShopifyOauthCookiePayload => ({
  nonce: crypto.randomUUID(),
  tenantId,
  shop,
  returnTo: getSafeReturnPath(returnTo),
});

export const serializeShopifyOauthCookie = (payload: ShopifyOauthCookiePayload): string => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

export const parseShopifyOauthCookie = (raw?: string): ShopifyOauthCookiePayload | null => {
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<ShopifyOauthCookiePayload>;

    if (!parsed.nonce || !parsed.tenantId || !parsed.shop) {
      return null;
    }

    return {
      nonce: parsed.nonce,
      tenantId: parsed.tenantId,
      shop: parsed.shop,
      returnTo: getSafeReturnPath(parsed.returnTo),
    };
  } catch {
    return null;
  }
};

export const buildShopifyAuthUrl = (shop: string, state: string): string => {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set('client_id', getRequiredEnv('SHOPIFY_CLIENT_ID'));
  url.searchParams.set('scope', getShopifyOauthScopes());
  url.searchParams.set('redirect_uri', getShopifyRedirectUri());
  url.searchParams.set('state', state);
  return url.toString();
};

export const verifyShopifyCallbackHmac = (searchParams: URLSearchParams): boolean => {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  const message = [...searchParams.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const digest = crypto
    .createHmac('sha256', getRequiredEnv('SHOPIFY_CLIENT_SECRET'))
    .update(message)
    .digest('hex');

  const expected = Buffer.from(digest, 'utf8');
  const actual = Buffer.from(hmac, 'utf8');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

export const exchangeShopifyCode = async (shop: string, code: string): Promise<string> => {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: getRequiredEnv('SHOPIFY_CLIENT_ID'),
      client_secret: getRequiredEnv('SHOPIFY_CLIENT_SECRET'),
      code,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { access_token?: string };
  const accessToken = payload.access_token?.trim() ?? '';

  if (!response.ok || !accessToken) {
    throw new Error(`Shopify token exchange failed (${response.status})`);
  }

  return accessToken;
};

export const fetchShopifyBlogs = async (shop: string, accessToken: string): Promise<ShopifyBlogRecord[]> => {
  const response = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as { blogs?: ShopifyBlogRecord[] };
  if (!response.ok) {
    throw new Error(`Shopify blog lookup failed (${response.status})`);
  }

  return Array.isArray(payload.blogs) ? payload.blogs : [];
};

export const pickPrimaryShopifyBlog = (blogs: ShopifyBlogRecord[]): ShopifyBlogRecord | null => {
  if (blogs.length === 0) return null;
  return blogs[0] ?? null;
};