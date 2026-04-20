// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Events Track Route
// POST /api/events/track — lead scoring event ingestion
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { processLeadEvent } from '../../../../lib/integrations/hubspot';

export const runtime = 'edge';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  const { contactId, eventType, metadata = {} } = await req.json() as {
    contactId?: string; eventType?: string; metadata?: Record<string, unknown>;
  };
  if (!contactId || !eventType) {
    return NextResponse.json({ error: 'contactId and eventType required' }, { status: 400 });
  }

  const result = await processLeadEvent(tenant, contactId, eventType);
  return NextResponse.json({ ...result, tenantId: tenant.id, contactId, eventType });
}
