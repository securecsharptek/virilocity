// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — M365 Teams Notify Route
// POST /api/m365/teams/notify
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../../lib/auth/middleware';
import { getAppClient, GraphTeams } from '../../../../../lib/m365/graph.client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }

  const { teamId, channelId, message } = await req.json() as {
    teamId?: string; channelId?: string; message?: string;
  };
  if (!teamId || !channelId || !message) {
    return NextResponse.json({ error: 'teamId, channelId, message required' }, { status: 400 });
  }

  const client    = await getAppClient();
  const messageId = await new GraphTeams(client).sendChannelMessage(teamId, channelId, message);
  return NextResponse.json({ sent: true, messageId });
}
