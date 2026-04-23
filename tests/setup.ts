// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Test Setup
// Mocks: Upstash Redis, Anthropic SDK, Stripe, MSAL, Neon DB
// Ensures all tests run without network calls
// ─────────────────────────────────────────────────────────────────────────────
import { vi } from 'vitest';

// ── Env defaults ──────────────────────────────────────────────────────────────
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_PUBLIC_KEY: 'test-public-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
  HUBSPOT_CLIENT_SECRET: 'test-hubspot-secret-32-chars!!!!!',
  HUBSPOT_CLIENT_ID: 'test-hubspot-client-id',
  NEXT_PUBLIC_APP_URL: 'https://app.virilocity.io',
  ENTRA_CLIENT_ID: 'test-entra-client-id',
  ENTRA_CLIENT_SECRET: 'test-entra-secret',
  ENTRA_TENANT_ID: 'test-tenant-id',
  AUTH_SECRET: 'test-auth-secret-min-32-chars!!!!!',
  CRON_SECRET: 'test-cron-secret',
});

// Ensure Upstash is NOT configured so in-memory fallback is used in tests
delete process.env['UPSTASH_REDIS_REST_URL'];
delete process.env['UPSTASH_REDIS_REST_TOKEN'];

// ── Mock Anthropic SDK ────────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"status":"mocked","result":"ok"}' }],
      }),
    },
  })),
}));

// ── Mock Stripe ───────────────────────────────────────────────────────────────
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn().mockImplementation((body, sig, secret) => {
        if (!sig || !secret) throw new Error('Missing signature');
        return { type: 'checkout.session.completed', data: { object: { metadata: {} } } };
      }),
    },
    checkout: {
      sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) },
    },
  })),
}));

// ── Mock MSAL ─────────────────────────────────────────────────────────────────
vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: vi.fn().mockImplementation(() => ({
    getAuthCodeUrl: vi.fn().mockResolvedValue('https://login.microsoftonline.com/mock/oauth2/authorize?mock=true'),
    acquireTokenByCode: vi.fn().mockResolvedValue({ accessToken: 'mock-access-token', expiresOn: new Date(Date.now() + 3600_000) }),
    acquireTokenByClientCredential: vi.fn().mockResolvedValue({ accessToken: 'mock-app-only-token' }),
  })),
  LogLevel: { Error: 0, Warning: 1, Info: 2, Verbose: 3, Trace: 4 },
}));

// ── Mock Azure Key Vault ──────────────────────────────────────────────────────
vi.mock('@azure/keyvault-secrets', () => ({
  SecretClient: vi.fn().mockImplementation(() => ({
    getSecret: vi.fn().mockResolvedValue({ value: 'mock-secret-value' }),
    setSecret: vi.fn().mockResolvedValue({ name: 'mock-secret' }),
  })),
}));

// ── Mock Neon DB ──────────────────────────────────────────────────────────────
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn().mockReturnValue(vi.fn().mockResolvedValue([])),
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end:   vi.fn().mockResolvedValue(undefined),
  })),
}));

// ── Mock drizzle-orm ──────────────────────────────────────────────────────────
vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: vi.fn().mockReturnValue({
    select:  vi.fn().mockReturnThis(),
    from:    vi.fn().mockReturnThis(),
    where:   vi.fn().mockReturnThis(),
    limit:   vi.fn().mockResolvedValue([]),
    insert:  vi.fn().mockReturnThis(),
    values:  vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
  }),
}));


// ── Mock Auth Middleware ───────────────────────────────────────────────────────
// Integration tests use 'Bearer valid.test.token' — return a valid Pro B2B tenant
vi.mock('../lib/auth/middleware.js', () => ({
  authenticate: vi.fn().mockImplementation(async (header: string | null | undefined) => {
    if (header === 'Bearer valid.test.token') {
      return {
        ok: true,
        ctx: {
          tenantId: 'tenant_test_001',
          userId:   'user_test_001',
          tenant: {
            id: 'tenant_test_001', name: 'Test Corp', tier: 'pro',
            model: 'b2b', status: 'active', metadata: {},
          },
          tier: 'pro', model: 'b2b',
        },
      };
    }
    return { ok: false, error: { type: 'missing_token' } };
  }),
  extractBearer:  (h: string | null | undefined) => (h?.startsWith('Bearer ') ? h.slice(7) : null),
  authErrorToHttp: (e: { type: string; detail?: string; required?: string }) => {
    const map: Record<string, [number, Record<string, unknown>]> = {
      missing_token:      [401, { error: 'Authorization header required' }],
      invalid_token:      [401, { error: 'Invalid or expired token', detail: e.detail }],
      rate_limited:       [429, { error: 'Rate limit exceeded', retryAfter: 60 }],
      tenant_not_found:   [404, { error: 'Tenant not found' }],
      tenant_suspended:   [403, { error: 'Account suspended' }],
      insufficient_tier:  [403, { error: `Requires ${e.required} tier or above` }],
    };
    return map[e.type] ?? [500, { error: 'Internal error' }];
  },
}));

// ── Mock Upstash Redis ────────────────────────────────────────────────────────
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => {
    throw new Error('Upstash not configured in test env');
  }),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => {
    throw new Error('Ratelimit not configured in test env');
  }),
}));
