import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '@/lib/auth/middleware';
import { getSecret } from '@/lib/auth/keyvault';
import {
  fetchWebflowCollections,
  fetchWebflowSites,
  type WebflowCollection,
  type WebflowSite,
} from '@/lib/integrations/webflow';

export const runtime = 'nodejs';

type CmsSession = {
  tenantId?: string;
  user?: { email?: string | null };
} | null;

const tenantIdFromSession = (session: CmsSession): string | null => {
  if (session?.tenantId) return session.tenantId;
  if (session?.user?.email) return `tenant_${session.user.email}`;
  return null;
};

const resolveTenantId = async (req: NextRequest): Promise<{ tenantId: string } | { errorResponse: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  const hasBearerToken = typeof authHeader === 'string' && /^Bearer\s+\S+$/i.test(authHeader.trim());

  if (hasBearerToken) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [status, body] = authErrorToHttp(bearerAuth.error);
      return { errorResponse: NextResponse.json(body, { status }) };
    }

    return { tenantId: bearerAuth.ctx.tenant.id };
  }

  let session: CmsSession;
  try {
    session = (await auth()) as CmsSession;
  } catch {
    session = null;
  }

  const tenantId = tenantIdFromSession(session);
  if (!tenantId) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { tenantId };
};

const normalizeSite = (site: WebflowSite): { id: string; name: string } => ({
  id: site.id,
  name: site.displayName || site.id,
});

const normalizeCollection = (collection: WebflowCollection): { id: string; name: string; slug?: string } => ({
  id: collection.id,
  name: collection.displayName || collection.id,
  ...(collection.slug ? { slug: collection.slug } : {}),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantResolution = await resolveTenantId(req);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const tenantId = tenantResolution.tenantId;
  const token = (await getSecret(`webflow-token-${tenantId}`)).trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Webflow is not connected' }, { status: 400 });
  }

  try {
    const sites = await fetchWebflowSites(token);
    if (sites.length === 0) {
      return NextResponse.json({ ok: false, error: 'No Webflow sites found for this account' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requestedSiteId = searchParams.get('siteId')?.trim() ?? '';
    const savedSiteId = (await getSecret(`webflow-site-${tenantId}`)).trim();
    const selectedSiteId = requestedSiteId || savedSiteId || sites[0]!.id;
    const selectedSite = sites.find(site => site.id === selectedSiteId) ?? sites[0]!;
    const collections = await fetchWebflowCollections(token, selectedSite.id);

    return NextResponse.json({
      ok: true,
      connected: true,
      selectedSiteId: selectedSite.id,
      sites: sites.map(normalizeSite),
      collections: collections.map(normalizeCollection),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Webflow discovery failed',
    }, { status: 502 });
  }
}
