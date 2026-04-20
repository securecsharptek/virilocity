// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Platform Info Route
// GET /api/platform
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { VERSION, CODENAME, PLATFORM, AGENT_COUNT, DB_TABLES, TEVV_FIXES } from '../../../lib/types/index';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    version:  VERSION,
    codename: CODENAME,
    platform: PLATFORM,
    agents:   AGENT_COUNT,
    tables:   DB_TABLES,
    tevv: {
      score:   95.4,
      version: 'V16.4',
      fixes:   TEVV_FIXES,
      wcag:    '2.2 AA',
      ssdf:    'SP800-218',
    },
    stack: {
      frontend: 'Next.js 15 App Router',
      database: 'Neon Postgres + Drizzle ORM',
      cache:    'Upstash Redis + LRU fallback',
      auth:     'NextAuth v5 + MSAL Entra ID',
      ai:       'Anthropic Claude SDK',
      billing:  'Stripe',
      crm:      'HubSpot',
      m365:     'Microsoft Graph + MSAL',
    },
    models: { opus: 'Enterprise', sonnet: 'Default', haiku: 'High-frequency (6 agents)' },
  });
}
