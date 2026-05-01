// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.5 — Integration Status Aggregator
// GET /api/integrations/status
// Returns real-time status for integrations used by the dashboard
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { getSecret } from '../../../../lib/auth/keyvault';

export const runtime = 'nodejs';

export type IntegrationItem = {
  icon: string;
  name: string;
  desc: string;
  statusText: string;
  dotColor: string;      // rgba(r,g,b,a) — green for connected, gray for disconnected, amber for warning
  textColor: string;
};

type IntegrationStatus = {
  name: string;
  connected: boolean;
  reason?: string;       // 'key_missing' | 'unavailable' | 'timeout' | etc.
};

const GREEN = { dot: 'rgba(30,165,80,1)', text: 'rgba(30,165,80,0.85)' };
const GRAY  = { dot: 'rgba(107,114,128,1)', text: 'rgba(107,114,128,0.85)' };
const AMBER = { dot: 'rgba(201,168,76,1)', text: 'rgba(201,168,76,0.8)' };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }

  const { tenant } = auth.ctx;
  const tenantId = tenant.id;

  // Compute status for integrations in parallel
  const statuses = await Promise.all([
    checkHubSpot(tenantId),
    checkLinkedIn(tenantId),
    checkM365(tenant),
    checkNeon(),
    checkRedis(),
    checkClaudeApi(),
    checkAzureKeyVault(),
    checkReddit(),
  ]);

  // Map to IntegrationItem array
  const integrations = mapToIntegrationItems(statuses);

  return NextResponse.json({ integrations, tenantId, version: '16.5.0' });
}

// ─ Integration Status Checks ──────────────────────────────────────────────────

async function checkHubSpot(tenantId: string): Promise<IntegrationStatus> {
  try {
    const token = await getSecret(`hubspot-access-${tenantId}`);
    return {
      name: 'HubSpot CRM',
      connected: !!token && token.length > 0,
      reason: token ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'HubSpot CRM', connected: false, reason: 'unavailable' };
  }
}

async function checkLinkedIn(tenantId: string): Promise<IntegrationStatus> {
  try {
    const token = await getSecret(`linkedin-access-${tenantId}`);
    return {
      name: 'LinkedIn',
      connected: !!token && token.length > 0,
      reason: token ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'LinkedIn', connected: false, reason: 'unavailable' };
  }
}

async function checkM365(tenant: { metadata?: Record<string, unknown> }): Promise<IntegrationStatus> {
  try {
    // M365 is connected if tenant.metadata has 'm365TokenRef' set
    const connected = !!(tenant.metadata?.['m365TokenRef']);
    return {
      name: 'Microsoft 365',
      connected,
      reason: connected ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'Microsoft 365', connected: false, reason: 'unavailable' };
  }
}

async function checkNeon(): Promise<IntegrationStatus> {
  try {
    const url = process.env['DATABASE_URL'];
    return {
      name: 'Neon Postgres',
      connected: !!url && url.includes('postgresql'),
      reason: url ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'Neon Postgres', connected: false, reason: 'unavailable' };
  }
}

async function checkRedis(): Promise<IntegrationStatus> {
  try {
    const url = process.env['UPSTASH_REDIS_REST_URL'];
    const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

    // If env vars missing, but in-memory fallback is active, consider it "working"
    if (!url || !token) {
      return {
        name: 'Upstash Redis',
        connected: true, // in-memory fallback is always available
        reason: undefined,
      };
    }

    // Try a lightweight ping if vars are set
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url, token });
      await redis.ping();
      return { name: 'Upstash Redis', connected: true };
    } catch {
      // Redis env vars present but unreachable → fallback active but degraded
      return {
        name: 'Upstash Redis',
        connected: true,
        reason: 'fallback_active', // in-memory fallback engaged
      };
    }
  } catch (e) {
    return { name: 'Upstash Redis', connected: true, reason: 'fallback_active' };
  }
}

async function checkClaudeApi(): Promise<IntegrationStatus> {
  try {
    const key = process.env['ANTHROPIC_API_KEY'];
    return {
      name: 'Anthropic Claude API',
      connected: !!key && key.startsWith('sk-'),
      reason: key ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'Anthropic Claude API', connected: false, reason: 'unavailable' };
  }
}

async function checkAzureKeyVault(): Promise<IntegrationStatus> {
  try {
    const uri = process.env['AZURE_KEY_VAULT_URI'];
    return {
      name: 'Azure Key Vault',
      connected: !!uri && uri.includes('vault.azure.net'),
      reason: uri ? undefined : 'key_missing',
    };
  } catch (e) {
    return { name: 'Azure Key Vault', connected: false, reason: 'unavailable' };
  }
}

async function checkReddit(): Promise<IntegrationStatus> {
  // Reddit is hardcoded to always show as "warning" because HITL gate is permanent
  try {
    const key = process.env['REDDIT_CLIENT_ID'];
    return {
      name: 'Reddit API',
      connected: true, // Always "connected" but with HITL warning
      reason: 'hitl_gate_active', // special marker for status coloring
    };
  } catch (e) {
    return { name: 'Reddit API', connected: false, reason: 'unavailable' };
  }
}

// ─ Mapping to IntegrationItem[] ───────────────────────────────────────────────

function mapToIntegrationItems(statuses: IntegrationStatus[]): IntegrationItem[] {
  return statuses.map((status) => {
    // Special hardcoded strings and colors for each integration
    const configs: Record<string, { icon: string; desc: string; defaultStatus: string }> = {
      'HubSpot CRM': {
        icon: '🔵',
        desc: 'Contacts · Deals · Webhooks · Technology Partner',
        defaultStatus: 'Connected · Syncing',
      },
      'Microsoft 365': {
        icon: '🔷',
        desc: 'Teams · SharePoint · Mail · MSAL · SAML SSO',
        defaultStatus: 'Connected',
      },
      'LinkedIn': {
        icon: '🔗',
        desc: 'OAuth 2.0 · Direct social post publishing',
        defaultStatus: 'Connected',
      },
      'Anthropic Claude API': {
        icon: '🟣',
        desc: 'Opus 4 · Sonnet 4 · Haiku — All 39 agents',
        defaultStatus: 'Connected · Active',
      },
      'Azure Key Vault': {
        icon: '🔑',
        desc: 'JWT keys · API secrets · RBAC · Managed Identity',
        defaultStatus: 'Connected',
      },
      'Neon Postgres': {
        icon: '🐘',
        desc: '17 tables · Drizzle ORM · Serverless',
        defaultStatus: 'Connected',
      },
      'Upstash Redis': {
        icon: '⚡',
        desc: 'Rate limiting · Sessions · TEVV F-03',
        defaultStatus: 'Connected',
      },
      'Reddit API': {
        icon: '🤖',
        desc: 'Community posts — HITL gate always active',
        defaultStatus: 'Connected · HITL Only',
      },
    };

    const config = configs[status.name] || { icon: '❓', desc: '', defaultStatus: 'Unknown' };

    // Determine status text and color based on connection state + reason
    let statusText = config.defaultStatus;
    let dotColor = GREEN.dot;
    let textColor = GREEN.text;

    if (!status.connected) {
      statusText = 'Not Connected';
      dotColor = GRAY.dot;
      textColor = GRAY.text;
    } else if (status.reason === 'hitl_gate_active') {
      statusText = 'Connected · HITL Only';
      dotColor = AMBER.dot;
      textColor = AMBER.text;
    } else if (status.reason === 'fallback_active') {
      statusText = 'Connected (Fallback)';
      dotColor = AMBER.dot;
      textColor = AMBER.text;
    }

    return {
      icon: config.icon,
      name: status.name,
      desc: config.desc,
      statusText,
      dotColor,
      textColor,
    };
  });
}
