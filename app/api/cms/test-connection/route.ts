import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '@/lib/auth/middleware';
import { getSecret, setSecret } from '@/lib/auth/keyvault';

export const runtime = 'nodejs';

type CMSPlatform = 'wordpress' | 'shopify' | 'webflow' | 'hubspot';

type TestConnectionPayload = {
  platform?: CMSPlatform;
  tenantId?: string;
};

type CmsSession = {
  tenantId?: string;
  user?: { email?: string | null };
} | null;

const PLATFORM_NAME: Record<CMSPlatform, string> = {
  wordpress: 'WordPress',
  shopify: 'Shopify',
  webflow: 'Webflow',
  hubspot: 'HubSpot',
};

const tenantIdFromSession = (session: CmsSession): string | null => {
  if (session?.tenantId) return session.tenantId;
  if (session?.user?.email) return `tenant_${session.user.email}`;
  return null;
};

const resolveTenantId = async (req: NextRequest, requestedTenantId?: string): Promise<{ tenantId: string } | { errorResponse: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  const hasBearerToken = typeof authHeader === 'string' && /^Bearer\s+\S+$/i.test(authHeader.trim());

  if (hasBearerToken) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [status, body] = authErrorToHttp(bearerAuth.error);
      return { errorResponse: NextResponse.json(body, { status }) };
    }
    if (requestedTenantId && requestedTenantId !== bearerAuth.ctx.tenant.id) {
      return { errorResponse: NextResponse.json({ error: 'tenantId mismatch' }, { status: 403 }) };
    }
    return { tenantId: bearerAuth.ctx.tenant.id };
  }

  let session: CmsSession;
  try {
    session = (await auth()) as CmsSession;
  } catch {
    session = null;
  }

  const tenantId = requestedTenantId?.trim() || tenantIdFromSession(session);
  if (!tenantId) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { tenantId };
};

const getWordPressSecrets = async (tenantId: string): Promise<{ url: string; user: string; password: string }> => {
  const url = (await getSecret(`wp-url-${tenantId}`)) || (await getSecret(`wordpress-api-url-${tenantId}`));
  const user = (await getSecret(`wp-user-${tenantId}`)) || (await getSecret(`wordpress-user-${tenantId}`));
  const password = (await getSecret(`wp-password-${tenantId}`)) || (await getSecret(`wordpress-app-password-${tenantId}`));
  return { url: url.trim(), user: user.trim(), password: password.trim() };
};

const testWordPress = async (tenantId: string): Promise<{ connected: boolean; error?: string }> => {
  const { url, user, password } = await getWordPressSecrets(tenantId);
  if (!url || !user || !password) return { connected: false, error: 'Missing credentials' };

  const token = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
  const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wp/v2/users/me`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Basic ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    return res.ok ? { connected: true } : { connected: false, error: `Credential test failed (${res.status})` };
  } catch {
    return { connected: false, error: 'Network error' };
  }
};

const testShopify = async (tenantId: string): Promise<{ connected: boolean; error?: string }> => {
  const token = (await getSecret(`shopify-token-${tenantId}`)).trim();
  const shop = (await getSecret(`shopify-shop-${tenantId}`)).trim();
  const blogId = (await getSecret(`shopify-blog-id-${tenantId}`)).trim();

  if (!token || !shop || !blogId) return { connected: false, error: 'Missing credentials' };

  try {
    const res = await fetch(`https://${shop}/admin/api/2024-10/blogs.json`, {
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': token, Accept: 'application/json' },
      cache: 'no-store',
    });
    return res.ok ? { connected: true } : { connected: false, error: `Credential test failed (${res.status})` };
  } catch {
    return { connected: false, error: 'Network error' };
  }
};

const testWebflow = async (tenantId: string): Promise<{ connected: boolean; error?: string }> => {
  const token = (await getSecret(`webflow-token-${tenantId}`)).trim();
  const siteId = (await getSecret(`webflow-site-${tenantId}`)).trim();

  if (!token || !siteId) return { connected: false, error: 'Missing credentials' };

  try {
    const res = await fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(siteId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    return res.ok ? { connected: true } : { connected: false, error: `Credential test failed (${res.status})` };
  } catch {
    return { connected: false, error: 'Network error' };
  }
};

const testHubSpot = async (tenantId: string): Promise<{ connected: boolean; error?: string }> => {
  // OAuth token (from Settings → Integrations) takes priority over legacy private-app token
  const token = (
    (await getSecret(`hubspot-access-${tenantId}`)) ||
    (await getSecret(`hs-cms-token-${tenantId}`))
  ).trim();
  if (!token) return { connected: false, error: 'Not connected — connect HubSpot via OAuth from Settings → CMS or Settings → Integrations' };

  try {
    const configuredBlogId = (
      (process.env['HUBSPOT_BLOG_ID'] ?? '') ||
      (await getSecret(`hs-blog-id-${tenantId}`))
    ).trim();

    const blogEndpoint = configuredBlogId
      ? `https://api.hubapi.com/cms/v3/blog-settings/settings/${encodeURIComponent(configuredBlogId)}`
      : 'https://api.hubapi.com/cms/v3/blog-settings/settings?limit=1&archived=false';

    const cmsRes = await fetch(blogEndpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });

    // Preferred path: token has CMS blog access and a blog exists to publish into.
    if (cmsRes.ok) {
      const data = (await cmsRes.json().catch(() => ({}))) as Record<string, unknown>;
      const results = Array.isArray(data['results']) ? (data['results'] as Array<Record<string, unknown>>) : [];
      const blogId = configuredBlogId || String(results[0]?.['id'] ?? '');
      if (blogId) {
        await setSecret(`hs-blog-id-${tenantId}`, blogId);
        return { connected: true };
      }

      return {
        connected: false,
        error: 'HubSpot CMS is connected, but no HubSpot blog exists yet. Create a blog in HubSpot, then paste its Blog Settings ID in CMS settings.',
      };
    }

    // Fallback path: token is valid OAuth but lacks CMS scope or CMS entitlement.
    // We validate against CRM contact read, which is part of the base OAuth scopes.
    const crmRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1&properties=email', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (crmRes.ok) {
      if (cmsRes.status === 404 && configuredBlogId) {
        return {
          connected: false,
          error: 'The saved HubSpot Blog Settings ID was not found. Check the blog ID in HubSpot CMS settings.',
        };
      }

      return {
        connected: false,
        error: 'HubSpot CRM is connected, but CMS publishing scope is missing. Reconnect via /api/hubspot/auth?includeContentScope=true or add a HubSpot CMS private app token.',
      };
    }

    if (cmsRes.status === 401 || crmRes.status === 401) {
      return { connected: false, error: 'HubSpot token is invalid or expired. Reconnect HubSpot.' };
    }

    if (cmsRes.status === 403 || crmRes.status === 403) {
      return { connected: false, error: 'HubSpot permissions are insufficient. Reconnect and grant required scopes.' };
    }

    return { connected: false, error: `Credential test failed (cms:${cmsRes.status}, crm:${crmRes.status})` };
  } catch {
    return { connected: false, error: 'Network error' };
  }
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = (await req.json().catch(() => ({}))) as TestConnectionPayload;
  const platform = payload.platform;

  if (!platform || !Object.prototype.hasOwnProperty.call(PLATFORM_NAME, platform)) {
    return NextResponse.json({ connected: false, platformName: 'Unknown', error: 'Invalid platform' }, { status: 400 });
  }

  const tenantResolution = await resolveTenantId(req, payload.tenantId);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const tenantId = tenantResolution.tenantId;

  const result = platform === 'wordpress'
    ? await testWordPress(tenantId)
    : platform === 'shopify'
      ? await testShopify(tenantId)
      : platform === 'webflow'
        ? await testWebflow(tenantId)
        : await testHubSpot(tenantId);

  return NextResponse.json({
    connected: result.connected,
    platformName: PLATFORM_NAME[platform],
    ...(result.error ? { error: result.error } : {}),
  });
}
