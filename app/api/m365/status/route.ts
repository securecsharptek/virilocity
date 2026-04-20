import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
export const runtime = 'edge';
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) { const [s,b]=authErrorToHttp(auth.error); return NextResponse.json(b,{status:s}); }
  const { tenant } = auth.ctx;
  const connected = !!(tenant.metadata?.['m365TokenRef']);
  return NextResponse.json({ connected, tenantId: tenant.id, version: '16.4.0',
    features: { mail: connected, calendar: connected, sharepoint: connected, teams: connected } });
}
