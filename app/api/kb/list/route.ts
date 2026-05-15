// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Knowledge Base List Route
// GET /api/kb/list
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { auth as nextAuth } from '../../../../auth';
import { db, kbDocuments } from '../../../../lib/db/client';
import { eq, desc } from 'drizzle-orm';
import { trunc } from '../../../../lib/utils/index';
import type { Tenant } from '../../../../lib/types/index';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Bearer token or session fallback
  const authHeader = req.headers.get('authorization');
  let tenantId: string;
  if (authHeader) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [s, b] = authErrorToHttp(bearerAuth.error);
      return NextResponse.json(b, { status: s });
    }
    tenantId = bearerAuth.ctx.tenant.id;
  } else {
    const session = await nextAuth() as { tenantId?: string; user?: { email?: string | null } } | null;
    tenantId = session?.tenantId ?? (session?.user?.email ? `tenant_${session.user.email.replace(/[^a-z0-9]/gi, '_').slice(0, 24)}` : '');
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db.select().from(kbDocuments)
    .where(eq(kbDocuments.tenantId, tenantId))
    .orderBy(desc(kbDocuments.createdAt))
    .limit(200);

  const sizeBytes = rows.reduce((sum, r) => sum + new TextEncoder().encode(r.content).length, 0);

  return NextResponse.json({
    documents: rows.map(r => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      category: r.category,
      contentPreview: trunc(r.content, 200),
      sizeBytes: new TextEncoder().encode(r.content).length,
      vectorId: r.vectorId,
      createdAt: r.createdAt?.toISOString() ?? '',
    })),
    count: rows.length,
    tenantId,
    storageGb: parseFloat((sizeBytes / 1_073_741_824).toFixed(6)),
  });
}
