import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setSecret } from '../../../../lib/auth/keyvault';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const tenantId = (session as { tenantId?: string } | null)?.tenantId;
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

  if (!tenantId) {
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=missing_tenant`);
  }

  try {
    // Clear both tokens; integration status logic treats empty token as disconnected.
    await setSecret(`hubspot-access-${tenantId}`, '');
    await setSecret(`hubspot-refresh-${tenantId}`, '');
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=disconnected`);
  } catch (e) {
    const reason = encodeURIComponent(e instanceof Error ? e.message : String(e));
    return NextResponse.redirect(`${appUrl}/dashboard?hubspot=error&reason=${reason}`);
  }
}
