import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { getM365ConnectionStatus } from '../../../../lib/m365/token-store';

export const runtime = 'nodejs';
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) { const [s,b]=authErrorToHttp(auth.error); return NextResponse.json(b,{status:s}); }
  const { tenant } = auth.ctx;
  const status = await getM365ConnectionStatus(tenant.id);

  return NextResponse.json({
    connected: status.connected,
    tenantId: tenant.id,
    version: '16.5.0',
    source: status.source,
    expiresAt: status.expiresAt,
    features: {
      mail: status.connected,
      calendar: status.connected,
      sharepoint: status.connected,
      teams: status.connected,
    },
  });
}
