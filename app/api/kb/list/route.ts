// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Knowledge Base List Route
// GET /api/kb/list
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';

export const runtime = 'edge';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  // Production: SELECT * FROM kbDocuments WHERE tenantId = ? ORDER BY createdAt DESC
  return NextResponse.json({
    documents: [],
    count:     0,
    tenantId:  tenant.id,
    storageGb: 0,
  });
}
