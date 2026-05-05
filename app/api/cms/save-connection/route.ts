import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '@/lib/auth/middleware';
import { setSecret } from '@/lib/auth/keyvault';
import { checkRateLimit } from '@/lib/cache/ratelimit';

export const runtime = 'nodejs';

type CMSPlatform = 'wordpress' | 'shopify' | 'webflow' | 'hubspot';

type SaveConnectionPayload = {
  platform?: CMSPlatform;
  tenantId?: string;
  credentials?: Record<string, string>;
};

type CmsSession = {
  tenantId?: string;
  user?: { email?: string | null };
} | null;

type SaveRule = {
  fields: string[];
  secretMap: Record<string, string[]>;
};

const SAVE_RULES: Record<CMSPlatform, SaveRule> = {
  wordpress: {
    fields: ['siteUrl', 'username', 'appPassword'],
    secretMap: {
      siteUrl: ['wp-url-{tenantId}', 'wordpress-api-url-{tenantId}'],
      username: ['wp-user-{tenantId}', 'wordpress-user-{tenantId}'],
      appPassword: ['wp-password-{tenantId}', 'wordpress-app-password-{tenantId}'],
    },
  },
  shopify: {
    fields: ['storeUrl', 'adminApiToken', 'blogId'],
    secretMap: {
      storeUrl: ['shopify-shop-{tenantId}'],
      adminApiToken: ['shopify-token-{tenantId}'],
      blogId: ['shopify-blog-id-{tenantId}'],
    },
  },
  webflow: {
    fields: ['siteToken', 'siteId', 'collectionId'],
    secretMap: {
      siteToken: ['webflow-token-{tenantId}'],
      siteId: ['webflow-site-{tenantId}'],
      collectionId: ['webflow-collection-{tenantId}'],
    },
  },
  hubspot: {
    fields: ['cmsApiToken'],
    secretMap: {
      cmsApiToken: ['hs-cms-token-{tenantId}'],
    },
  },
};

const HOURLY_LIMIT = 10;
const _saveWindows = new Map<string, number[]>();

const withinSaveRateLimit = (tenantId: string): boolean => {
  const key = `${tenantId}:cms-save`;
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const kept = (_saveWindows.get(key) ?? []).filter(ts => ts > oneHourAgo);
  if (kept.length >= HOURLY_LIMIT) {
    _saveWindows.set(key, kept);
    return false;
  }
  kept.push(now);
  _saveWindows.set(key, kept);
  return true;
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
      return { errorResponse: NextResponse.json({ saved: false, error: 'tenantId mismatch' }, { status: 403 }) };
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
    return { errorResponse: NextResponse.json({ saved: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  return { tenantId };
};

const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const trimCredentials = (credentials: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    out[k] = typeof v === 'string' ? v.trim() : '';
  }
  return out;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = (await req.json().catch(() => ({}))) as SaveConnectionPayload;
  const platform = payload.platform;

  if (!platform || !Object.prototype.hasOwnProperty.call(SAVE_RULES, platform)) {
    return NextResponse.json({ saved: false, error: 'Invalid platform' }, { status: 400 });
  }

  const tenantResolution = await resolveTenantId(req, payload.tenantId);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const tenantId = tenantResolution.tenantId;

  const allowedByGlobalLimiter = await checkRateLimit(`${tenantId}:cms-connections`);
  if (!allowedByGlobalLimiter || !withinSaveRateLimit(tenantId)) {
    return NextResponse.json({ saved: false, error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
  }

  const credentials = trimCredentials(payload.credentials ?? {});
  const rule = SAVE_RULES[platform];

  const missing = rule.fields.filter(field => !credentials[field]);
  if (missing.length > 0) {
    return NextResponse.json({
      saved: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    }, { status: 400 });
  }

  if (platform === 'wordpress' && !isValidUrl(credentials['siteUrl'] ?? '')) {
    return NextResponse.json({ saved: false, error: 'siteUrl must be a valid URL' }, { status: 400 });
  }

  if (platform === 'shopify') {
    const normalizedStoreUrl = credentials['storeUrl'] ?? '';
    credentials['storeUrl'] = normalizedStoreUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  const saveJobs: Promise<string>[] = [];

  for (const [field, secretTemplates] of Object.entries(rule.secretMap)) {
    const value = credentials[field] ?? '';
    for (const template of secretTemplates) {
      const secretName = template.replace('{tenantId}', tenantId);
      saveJobs.push(setSecret(secretName, value));
    }
  }

  await Promise.all(saveJobs);

  return NextResponse.json({ saved: true });
}
