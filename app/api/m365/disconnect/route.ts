import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { clearM365Token } from '../../../../lib/m365/token-store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [status, body] = authErrorToHttp(auth.error);
    return NextResponse.json(body, { status });
  }

  await clearM365Token(auth.ctx.tenant.id);
  return NextResponse.json({ disconnected: true, tenantId: auth.ctx.tenant.id });
}
