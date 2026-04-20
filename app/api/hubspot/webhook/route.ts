// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — HubSpot Webhook Route  ·  TEVV FIX: F-02
// POST /api/hubspot/webhook
// Fixes: X-HubSpot-Request-Timestamp ±300s replay window enforced
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { verifyHubSpotWebhook } from '../../../../lib/webhook/verify';

export const runtime = 'nodejs'; // needs crypto

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const secret  = process.env['HUBSPOT_CLIENT_SECRET'] ?? '';

  // TEVV F-02: verify with timestamp replay protection
  const result = verifyHubSpotWebhook(rawBody, {
    'x-hubspot-signature-v3':      req.headers.get('x-hubspot-signature-v3') ?? undefined,
    'x-hubspot-request-timestamp': req.headers.get('x-hubspot-request-timestamp') ?? undefined,
  }, secret, 'POST', req.url);

  if (!result.ok) {
    return NextResponse.json(
      { error: `Webhook rejected: ${result.reason}` },
      { status: 401 },
    );
  }

  let events: Array<Record<string, unknown>>;
  try {
    events = JSON.parse(rawBody);
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const results = await Promise.all(events.map(processHubSpotEvent));
  return NextResponse.json({ processed: results.flat().length });
}

const processHubSpotEvent = async (event: Record<string, unknown>): Promise<string[]> => {
  const type = event['subscriptionType'] as string | undefined;
  const actions: string[] = [];

  switch (type) {
    case 'contact.creation':
      actions.push('contact_created');
      break;
    case 'contact.propertyChange': {
      const prop  = event['propertyName'] as string;
      const value = event['propertyValue'] as string;
      if (prop === 'lifecyclestage' && value === 'marketingqualifiedlead')
        actions.push('mql_triggered_retargeting');
      else if (prop === 'lifecyclestage' && value === 'salesqualifiedlead')
        actions.push('sql_triggered_deal_creation');
      break;
    }
    default:
      break;
  }
  return actions;
};
