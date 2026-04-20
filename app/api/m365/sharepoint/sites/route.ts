// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — M365 SharePoint Sites Route
// GET /api/m365/sharepoint/sites
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../../lib/auth/middleware';
import { getAppClient, GraphSharePoint } from '../../../../../lib/m365/graph.client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }

  const { searchParams } = new URL(req.url);
  const query  = searchParams.get('q') ?? '';
  const client = await getAppClient();
  const sites  = await new GraphSharePoint(client).listSites(query);
  return NextResponse.json({ sites });
}
