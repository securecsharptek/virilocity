// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — M365 Mail Send Route
// POST /api/m365/mail/send
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../../lib/auth/middleware';
import { getAppClient, GraphMail } from '../../../../../lib/m365/graph.client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }

  const { to, subject, bodyHtml, cc } = await req.json() as {
    to?: string[]; subject?: string; bodyHtml?: string; cc?: string[];
  };
  if (!to?.length || !subject || !bodyHtml) {
    return NextResponse.json({ error: 'to, subject, bodyHtml required' }, { status: 400 });
  }

  const client = await getAppClient();
  await new GraphMail(client).sendEmail({ to, subject, bodyHtml, cc });
  return NextResponse.json({ sent: true, to, subject });
}
