// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML SP Metadata Route
// GET /api/auth/saml/metadata?tenantId=xxx
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { generateSPMetadata } from '../../../../../lib/m365/saml.sso';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') ?? 'default';
  const xml = await generateSPMetadata(tenantId);
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
