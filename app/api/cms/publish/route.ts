import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [status, body] = authErrorToHttp(auth.error);
    return NextResponse.json(body, { status });
  }

  const payload = await req.json() as PublishPayload;

  if (!payload.provider || (payload.provider !== 'shopify' && payload.provider !== 'webflow')) {
    return NextResponse.json({
      ok: false,
      error: {
        provider: payload.provider ?? 'unknown',
        code: 'invalid_payload',
        message: 'provider must be one of: shopify, webflow',
        retryable: false,
      },
    }, { status: 400 });
  }

  try {
    const result = await publishCMSContent({
      tenantId: auth.ctx.tenant.id,
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
