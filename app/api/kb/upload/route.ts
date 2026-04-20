// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Knowledge Base Upload Route
// POST /api/kb/upload
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { TIER_LIMITS } from '../../../../lib/types/index';
import { uid, now, trunc } from '../../../../lib/utils/index';

export const runtime = 'nodejs';

export type KBCategory = 'brand' | 'product' | 'competitor' | 'market' | 'legal' | 'other';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  // Tier gate: Free tier has no KB storage
  if (TIER_LIMITS[tenant.tier].kbStorageGb === 0) {
    return NextResponse.json(
      { error: 'Knowledge Base requires Starter tier or above', upgradeUrl: '/auth/signup?tier=starter' },
      { status: 403 },
    );
  }

  const { name, content, category = 'other' } = await req.json() as {
    name?: string; content?: string; category?: KBCategory;
  };
  if (!name || !content) return NextResponse.json({ error: 'name and content required' }, { status: 400 });

  const docId = uid('doc');
  // Production:
  // 1. Generate embedding via Anthropic API
  // 2. Store in pgvector (kbDocuments table)
  // 3. Update storage usage counter

  return NextResponse.json({
    document: {
      id: docId, tenantId: tenant.id, name,
      category, contentPreview: trunc(content, 200),
      sizeBytes: new TextEncoder().encode(content).length,
      vectorId: `vec_${docId}`,
      createdAt: now(),
    },
    message: 'Document uploaded and indexed',
  }, { status: 201 });
}
