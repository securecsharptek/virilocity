import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '@/lib/auth/middleware';
import { setSecret } from '@/lib/auth/keyvault';

export const runtime = 'nodejs';

type CMSPlatform = 'wordpress' | 'shopify' | 'webflow' | 'hubspot';

type DisconnectPayload = {
  platform?: CMSPlatform;
  tenantId?: string;
};

type CmsSession = {
  tenantId?: string;
  user?: { email?: string | null };
} | null;

const DISCONNECT_SECRETS: Record<CMSPlatform, string[]> = {
  wordpress: [
    'wp-url-{tenantId}',
    'wp-user-{tenantId}',
    'wp-password-{tenantId}',
    'wordpress-api-url-{tenantId}',
    'wordpress-user-{tenantId}',
    'wordpress-app-password-{tenantId}',
  ],
  shopify: [
    'shopify-shop-{tenantId}',
    'shopify-token-{tenantId}',
    'shopify-blog-id-{tenantId}',
  ],
  webflow: [
    'webflow-token-{tenantId}',
    'webflow-site-{tenantId}',
    'webflow-site-name-{tenantId}',
    'webflow-collection-{tenantId}',
    'webflow-collection-name-{tenantId}',
  ],
  hubspot: [
    'hs-cms-token-{tenantId}',
    'hubspot-access-{tenantId}',
    'hubspot-refresh-{tenantId}',
  ],
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
      return { errorResponse: NextResponse.json({ ok: false, error: 'tenantId mismatch' }, { status: 403 }) };
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
    return { errorResponse: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  return { tenantId };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = (await req.json().catch(() => ({}))) as DisconnectPayload;
  const platform = payload.platform;

  if (!platform || !Object.prototype.hasOwnProperty.call(DISCONNECT_SECRETS, platform)) {
    return NextResponse.json({ ok: false, error: 'Invalid platform' }, { status: 400 });
  }

  const tenantResolution = await resolveTenantId(req, payload.tenantId);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const secretNames = DISCONNECT_SECRETS[platform].map(template => template.replace('{tenantId}', tenantResolution.tenantId));
  await Promise.all(secretNames.map(name => setSecret(name, '')));

  return NextResponse.json({ ok: true, disconnected: true, platform });
}