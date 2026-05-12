// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Knowledge Base Upload Route
// POST /api/kb/upload
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { auth as nextAuth } from '../../../../auth';
import { TIER_LIMITS } from '../../../../lib/types/index';
import { uid, now, trunc } from '../../../../lib/utils/index';
import { db, kbDocuments, tenants } from '../../../../lib/db/client';
import type { Tenant } from '../../../../lib/types/index';

export const runtime = 'nodejs';

export type KBCategory = 'brand' | 'product' | 'competitor' | 'market' | 'legal' | 'other';

const ALLOWED_CATEGORIES: KBCategory[] = ['brand', 'product', 'competitor', 'market', 'legal', 'other'];

const resolveTenant = async (req: NextRequest): Promise<{ ok: true; tenant: Tenant } | { ok: false; res: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [s, b] = authErrorToHttp(bearerAuth.error);
      return { ok: false, res: NextResponse.json(b, { status: s }) };
    }
    return { ok: true, tenant: bearerAuth.ctx.tenant };
  }
  // Session fallback for browser requests
  const session = await nextAuth() as { tenantId?: string; tier?: Tenant['tier']; model?: Tenant['model']; user?: { email?: string | null } } | null;
  const tenantId = session?.tenantId ?? (session?.user?.email ? `tenant_${session.user.email.replace(/[^a-z0-9]/gi, '_').slice(0, 24)}` : '');
  if (!tenantId) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { ok: true, tenant: { id: tenantId, name: session?.user?.email ?? 'Tenant', tier: session?.tier ?? 'free', model: session?.model ?? 'b2c', status: 'active', createdAt: new Date().toISOString() } };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const resolved = await resolveTenant(req);
  if (!resolved.ok) return resolved.res;
  const { tenant } = resolved;

  const { name, content, category = 'other' } = await req.json() as {
    name?: string; content?: string; category?: KBCategory;
  };
  if (!name?.trim() || !content?.trim()) return NextResponse.json({ error: 'name and content required' }, { status: 400 });
  const safeCategory: KBCategory = ALLOWED_CATEGORIES.includes(category as KBCategory) ? (category as KBCategory) : 'other';

  const docId = uid('doc');
  const sizeBytes = new TextEncoder().encode(content).length;

  // Ensure tenant row exists before FK-constrained KB insert
  await db.insert(tenants).values({
    id: tenant.id,
    name: tenant.name,
    tier: tenant.tier as string,
    model: tenant.model,
    status: 'active',
  }).onConflictDoNothing();

  await db.insert(kbDocuments).values({
    id: docId,
    tenantId: tenant.id,
    name: name.trim().slice(0, 255),
    content: content.trim(),
    category: safeCategory,
    vectorId: `vec_${docId}`,
  });

  return NextResponse.json({
    document: {
      id: docId, tenantId: tenant.id, name: name.trim(),
      category: safeCategory, contentPreview: trunc(content, 200),
      sizeBytes,
      vectorId: `vec_${docId}`,
      createdAt: now(),
    },
    message: 'Document uploaded and indexed',
  }, { status: 201 });
}
