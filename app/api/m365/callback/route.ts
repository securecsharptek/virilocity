import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
import { parseSignedState, storeM365Token } from '../../../../lib/m365/token-store';
export const runtime = 'nodejs';
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  if (error) return NextResponse.json({ error: `Entra auth failed: ${error}` }, { status: 400 });
  if (!code || !state) return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });

  const stateCheck = parseSignedState(state, 'm365_oauth');
  if (!stateCheck.ok) {
    return NextResponse.json({ error: `Invalid OAuth state: ${stateCheck.error}` }, { status: 400 });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
  const msalApp = new ConfidentialClientApplication({
    auth: {
      clientId: process.env['ENTRA_CLIENT_ID'] ?? '',
      authority: `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}`,
      clientSecret: process.env['ENTRA_CLIENT_SECRET'] ?? '',
    },
    system: { loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel.Warning } },
  });

  const tokenResult = await msalApp.acquireTokenByCode({
    code,
    redirectUri: `${appUrl}/api/m365/callback`,
    scopes: [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Sites.ReadWrite.All',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Team.ReadBasic.All',
      'https://graph.microsoft.com/ChannelMessage.Send',
      'offline_access',
    ],
  });

  if (!tokenResult?.accessToken) {
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
  }

  await storeM365Token(stateCheck.tenantId, {
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    expiresOn: tokenResult.expiresOn ?? null,
    scope: tokenResult.scopes?.join(' ') ?? '',
  });

  return NextResponse.redirect(`${appUrl}/dashboard?m365=connected`);
}
