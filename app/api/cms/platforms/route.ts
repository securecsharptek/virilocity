import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import {
  connectWordPressPlatform,
  getCmsPlatformsStatus,
} from '../../../../lib/integrations/cms/platforms';

export const runtime = 'nodejs';

type ConnectWordPressPayload = {
  provider?: string;
  WP_API_URL?: string;
  WP_USER?: string;
  WP_APP_PASSWORD?: string;
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
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { tenantId };
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const tenantResolution = await resolveTenantId(req);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const platforms = await getCmsPlatformsStatus(tenantResolution.tenantId);

  return NextResponse.json({
    ok: true,
    platforms,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenantResolution = await resolveTenantId(req);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const payload = (await req.json()) as ConnectWordPressPayload;

  if (payload.provider !== 'wordpress') {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'invalid_payload',
          message: 'provider must be wordpress',
        },
      },
      { status: 400 },
    );
  }

  const apiUrl = payload.WP_API_URL?.trim() ?? '';
  const user = payload.WP_USER?.trim() ?? '';
  const appPassword = payload.WP_APP_PASSWORD?.trim() ?? '';

  if (!apiUrl || !user || !appPassword) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'invalid_payload',
          message: 'WP_API_URL, WP_USER, and WP_APP_PASSWORD are required',
        },
      },
      { status: 400 },
    );
  }

  if (!isValidHttpUrl(apiUrl)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'invalid_payload',
          message: 'WP_API_URL must be a valid http(s) URL',
        },
      },
      { status: 400 },
    );
  }

  const result = await connectWordPressPlatform(tenantResolution.tenantId, {
    apiUrl,
    user,
    appPassword,
  });

  if (!result.connected) {
    return NextResponse.json(
      {
        ok: false,
        provider: 'wordpress',
        connected: false,
        error: {
          code: 'connection_failed',
          message: result.details,
          statusCode: result.statusCode,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    provider: 'wordpress',
    connected: true,
    statusText: 'Connected',
  });
}
