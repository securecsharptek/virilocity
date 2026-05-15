// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — HubSpot Integration
// OAuth2 · Webhook processor · Contact/Deal lifecycle management
// TEVV F-02: Timestamp replay window enforced in lib/webhook/verify.ts
// ─────────────────────────────────────────────────────────────────────────────
import type { Tenant } from '../types/index';

const HS_BASE = 'https://api.hubapi.com';

// Scopes must exactly match the Required scopes configured in the HubSpot app
// (app-na2.hubspot.com/developer/.../auth → Scopes).
// Keep content scope opt-in because many tenants only configure CRM scopes.
const DEFAULT_BASE_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'oauth',
];

const parseScopes = (raw: string): string[] => {
  return raw
    .split(/[\s,]+/)
    .map(scope => scope.trim())
    .filter(Boolean);
};

const getBaseScopes = (): string[] => {
  const explicit = (process.env['HUBSPOT_OAUTH_SCOPES'] ?? '').trim();
  if (explicit) return parseScopes(explicit);
  return [...DEFAULT_BASE_SCOPES];
};

const buildScopes = (includeContentScope: boolean): string => {
  const scopes = getBaseScopes();
  if (includeContentScope && !scopes.includes('content')) {
    scopes.push('content');
  }
  return scopes.join(' ');
};

// ── OAuth2 ────────────────────────────────────────────────────────────────────
export class HubSpotAuth {
  static getAuthUrl(tenantId: string, options?: { includeContentScope?: boolean }): string {
    // URLSearchParams encodes spaces as '+' but HubSpot OAuth requires '%20'.
    // Build the query string manually to ensure correct encoding.
    const includeContentScope = options?.includeContentScope === true;
    const clientId    = encodeURIComponent(process.env['HUBSPOT_CLIENT_ID'] ?? '');
    const redirectUri = encodeURIComponent(`${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/api/hubspot/callback`);
    const scope       = encodeURIComponent(buildScopes(includeContentScope));   // spaces → %20
    const state       = encodeURIComponent(tenantId);
    return `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  }

  static async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const resp = await fetch(`${HS_BASE}/oauth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     process.env['HUBSPOT_CLIENT_ID']     ?? '',
        client_secret: process.env['HUBSPOT_CLIENT_SECRET'] ?? '',
        redirect_uri:  `${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/api/hubspot/callback`,
        code,
      }),
    });
    if (!resp.ok) throw new Error(`HubSpot token exchange failed: ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    return {
      accessToken:  data['access_token']  as string,
      refreshToken: data['refresh_token'] as string,
      expiresIn:    data['expires_in']    as number,
    };
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const resp = await fetch(`${HS_BASE}/oauth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env['HUBSPOT_CLIENT_ID']     ?? '',
        client_secret: process.env['HUBSPOT_CLIENT_SECRET'] ?? '',
        refresh_token: refreshToken,
      }),
    });
    if (!resp.ok) throw new Error(`HubSpot token refresh failed: ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    return { accessToken: data['access_token'] as string, expiresIn: data['expires_in'] as number };
  }
}

// ── Contacts API ──────────────────────────────────────────────────────────────
export class HubSpotContacts {
  constructor(private readonly accessToken: string) {}

  async listContacts(limit = 100): Promise<Array<{ id: string; properties?: Record<string, string | null> }>> {
    const propertyList = [
      'email',
      'firstname',
      'lastname',
      'company',
      'lifecyclestage',
      'hs_lead_status',
      'hs_lead_score',
      'hubspotscore',
      'hs_predictivecontactscore_v2',
      'risk',
      'risk_level',
      'churn_risk',
      'churn_risk_score',
      'lastmodifieddate',
    ].join(',');

    const resp = await fetch(
      `${HS_BASE}/crm/v3/objects/contacts?limit=${Math.max(1, Math.min(limit, 100))}&properties=${propertyList}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    if (!resp.ok) throw new Error(`HubSpot list contacts failed: ${resp.status}`);
    const data = await resp.json() as {
      results?: Array<{ id: string; properties?: Record<string, string | null> }>;
    };
    return data.results ?? [];
  }

  async getContact(id: string): Promise<Record<string, unknown>> {
    const resp = await fetch(`${HS_BASE}/crm/v3/objects/contacts/${id}?properties=email,firstname,lastname,lifecyclestage,hs_lead_status`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!resp.ok) throw new Error(`HubSpot get contact failed: ${resp.status}`);
    return resp.json() as Promise<Record<string, unknown>>;
  }

  async updateContact(id: string, properties: Record<string, string>): Promise<void> {
    const resp = await fetch(`${HS_BASE}/crm/v3/objects/contacts/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
    if (!resp.ok) throw new Error(`HubSpot update contact failed: ${resp.status}`);
  }

  async searchContacts(filter: { propertyName: string; operator: string; value: string }): Promise<unknown[]> {
    const resp = await fetch(`${HS_BASE}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filterGroups: [{ filters: [filter] }], limit: 100 }),
    });
    if (!resp.ok) throw new Error(`HubSpot search failed: ${resp.status}`);
    const data = await resp.json() as { results: unknown[] };
    return data.results;
  }
}

// ── Webhook processor ─────────────────────────────────────────────────────────
export class HubSpotWebhookProcessor {
  static async process(
    event:  Record<string, unknown>,
    tenant: Tenant,
  ): Promise<string[]> {
    const type = event['subscriptionType'] as string | undefined;
    const actions: string[] = [];

    switch (type) {
      case 'contact.creation':
        actions.push('contact_created');
        break;

      case 'contact.propertyChange': {
        const prop  = event['propertyName']  as string;
        const value = event['propertyValue'] as string;
        if (prop === 'lifecyclestage') {
          if (value === 'marketingqualifiedlead') actions.push('mql_triggered_retargeting');
          if (value === 'salesqualifiedlead')     actions.push('sql_triggered_deal_creation');
          if (value === 'customer')               actions.push('customer_converted_upsell_queued');
        }
        if (prop === 'hs_lead_status' && value === 'IN_PROGRESS') actions.push('lead_in_progress_sequence_started');
        break;
      }

      case 'deal.creation':
        actions.push('deal_created_revenue_forecast_updated');
        break;

      case 'deal.propertyChange': {
        const prop = event['propertyName'] as string;
        if (prop === 'dealstage' && event['propertyValue'] === 'closedwon') {
          actions.push('deal_closed_won_churn_model_updated');
        }
        break;
      }

      default:
        break;
    }

    return actions;
  }
}

// ── Lead event processor (for /api/events/track) ──────────────────────────────
export const processLeadEvent = async (
  tenant:    Tenant,
  contactId: string,
  eventType: string,
): Promise<{ processed: boolean; action: string }> => {
  const actions: Record<string, string> = {
    'page_view':       'increment_score_5',
    'form_submit':     'increment_score_25',
    'email_open':      'increment_score_10',
    'email_click':     'increment_score_15',
    'demo_request':    'increment_score_50',
    'pricing_view':    'increment_score_20',
    'dashboard_login': 'increment_score_5',
  };
  const action = actions[eventType] ?? 'noop';
  return { processed: true, action };
};
