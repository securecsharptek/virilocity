import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
export const runtime = 'nodejs';
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) { const [s,b]=authErrorToHttp(auth.error); return NextResponse.json(b,{status:s}); }
  const { tenant } = auth.ctx;
  const msalApp = new ConfidentialClientApplication({
    auth: {
      clientId: process.env['ENTRA_CLIENT_ID'] ?? '',
      authority: `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}`,
      clientSecret: process.env['ENTRA_CLIENT_SECRET'] ?? '',
    },
    system: { loggerOptions: { loggerCallback: ()=>{}, logLevel: LogLevel.Warning } },
  });
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
  const url = await msalApp.getAuthCodeUrl({
    scopes: ['https://graph.microsoft.com/Mail.Send','https://graph.microsoft.com/Mail.Read','https://graph.microsoft.com/Calendars.ReadWrite','https://graph.microsoft.com/Sites.ReadWrite.All','https://graph.microsoft.com/User.Read','https://graph.microsoft.com/Team.ReadBasic.All','https://graph.microsoft.com/ChannelMessage.Send','offline_access'],
    redirectUri: `${appUrl}/api/m365/callback`,
    state: tenant.id,
  });
  return NextResponse.redirect(url);
}
