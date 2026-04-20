import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  if (error) return NextResponse.json({ error: `Entra auth failed: ${error}` }, { status: 400 });
  if (!code || !state) return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  // Production: exchange code → token → store in Key Vault via storeM365Token(state, token)
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
  return NextResponse.redirect(`${appUrl}/dashboard?m365=connected`);
}
