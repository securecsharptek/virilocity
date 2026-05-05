import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import {
  CMSIntegrationError,
  type CMSProvider,
  type CMSPublishStatus,
  publishCMSContent,
} from '../../../../lib/integrations/cms';

export const runtime = 'nodejs';

type PublishPayload = {
  provider?: CMSProvider;
  title?: string;
  slug?: string;
  htmlBody?: string;
  status?: CMSPublishStatus;
  schemaJson?: Record<string, unknown>;
};

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
    return { errorResponse: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
  }

  return { tenantId };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenantResolution = await resolveTenantId(req);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const payload = await req.json() as PublishPayload;

  const ALLOWED_PROVIDERS = ['shopify', 'webflow', 'wordpress', 'hubspot'] as const;
  if (!payload.provider || !(ALLOWED_PROVIDERS as readonly string[]).includes(payload.provider)) {
    return NextResponse.json({
      ok: false,
      error: {
        provider: payload.provider ?? 'unknown',
        code: 'invalid_payload',
        message: 'provider must be one of: shopify, webflow, wordpress, hubspot',
        retryable: false,
      },
    }, { status: 400 });
  }

  try {
    const result = await publishCMSContent({
      tenantId: tenantResolution.tenantId,
      provider: payload.provider,
      title: payload.title ?? '',
      slug: payload.slug ?? '',
      htmlBody: payload.htmlBody ?? '',
      status: payload.status,
      schemaJson: payload.schemaJson,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof CMSIntegrationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.payload,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          provider: payload.provider,
          code: 'unknown',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      },
      { status: 500 },
    );
  }
}
