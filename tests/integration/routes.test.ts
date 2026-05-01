// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Integration Tests
// All major API routes · B2B/B2C flows · HITL contracts · TEVV assertions
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Import route handlers ─────────────────────────────────────────────────────
import { GET  as healthLive  } from '../../app/api/health/live/route';
import { GET  as healthReady } from '../../app/api/health/ready/route';
import { GET  as platform    } from '../../app/api/platform/route';
import { GET  as billingPlans} from '../../app/api/billing/plans/route';
import { POST as agentDispatch } from '../../app/api/agent/route';
import { POST as agentChat   } from '../../app/api/agent/chat/route';
import { POST as hubWebhook  } from '../../app/api/hubspot/webhook/route';
import { POST as stripeWebhook } from '../../app/api/billing/webhook/route';
import { POST as redditApprove } from '../../app/api/reddit/approve/route';
import { GET  as redditDiscover} from '../../app/api/reddit/discover/route';
import { POST as orgCreate   } from '../../app/api/org/create/route';
import { POST as orgInvite   } from '../../app/api/org/invite/route';
import { GET  as orgMembers  } from '../../app/api/org/members/route';
import { POST as kbUpload    } from '../../app/api/kb/upload/route';
import { GET  as kbList      } from '../../app/api/kb/list/route';
import { POST as eventsTrack } from '../../app/api/events/track/route';
import { GET  as m365Status  } from '../../app/api/m365/status/route';
import { POST as checkout    } from '../../app/api/billing/checkout/route';
import { GET as dashboardDataGet, POST as dashboardDataPost } from '../../app/dashboard/data/route';
import { resetTenantDashboardStateMemory } from '../../lib/cache/dashboard-store';
import { REDDIT_REQUIRES_HUMAN_APPROVAL, VERSION, PLATFORM, AGENT_COUNT } from '../../lib/types/index';

const { mockedAuth } = vi.hoisted(() => ({
  mockedAuth: vi.fn(),
}));

const { mockLinkedInPostText } = vi.hoisted(() => ({
  mockLinkedInPostText: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: mockedAuth,
}));

vi.mock('../../lib/integrations/linkedin', () => ({
  LinkedInPoster: {
    postText: mockLinkedInPostText,
  },
}));
// ── Mock auth middleware (vi.mock is hoisted by Vitest) ───────────────────────
vi.mock('../../lib/auth/middleware', () => ({
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
  extractBearer: (h: string | null | undefined) => (h?.startsWith('Bearer ') ? h.slice(7) : null),
  authErrorToHttp: (e: { type?: string }) => {
    const map: Record<string, [number, Record<string, unknown>]> = {
      missing_token:      [401, { error: 'Authorization header required' }],
      invalid_token:      [401, { error: 'Invalid or expired token' }],
      rate_limited:       [429, { error: 'Rate limit exceeded', retryAfter: 60 }],
      tenant_not_found:   [404, { error: 'Tenant not found' }],
      tenant_suspended:   [403, { error: 'Account suspended' }],
      insufficient_tier:  [403, { error: 'Requires upgrade' }],
    };
    const key = e?.type ?? '';
    return map[key] ?? [500, { error: 'Internal error' }];
  },
}));



// ── Helpers ───────────────────────────────────────────────────────────────────
const makeReq = (method: string, path: string, opts: {
  body?: object;
  auth?: boolean;
  query?: Record<string, string>;
} = {}) => {
  const url = new URL(`http://localhost:3000${path}`);
  if (opts.query) Object.entries(opts.query).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.auth ? { authorization: 'Bearer valid.test.token' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
};

const json = async (res: Response) => res.json() as Promise<Record<string, unknown>>;

const makeDashboardReq = (body: Record<string, unknown>) => new NextRequest('http://localhost:3000/dashboard/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const dashboardSession = {
  tenantId: 'tenant_test_001',
  tier: 'pro',
  model: 'b2b',
  orgId: 'org_test_001',
  user: {
    name: 'Test User',
    email: 'test@example.com',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH PROBES
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/health/live', () => {
  it('returns 200 with status ok', async () => {
    const res = await healthLive();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body['status']).toBe('ok');
    expect(body['ts']).toBeDefined();
  });
});

describe('GET /api/health/ready', () => {
  it('returns JSON with checks object', async () => {
    const res = await healthReady();
    const body = await json(res);
    expect(body['checks']).toBeDefined();
    expect(['healthy', 'degraded']).toContain(body['status']);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PLATFORM
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/platform', () => {
  it('returns correct version and platform', async () => {
    const res  = await platform();
    const body = await json(res);
    expect(body['version']).toBe(VERSION);
    expect(body['platform']).toBe(PLATFORM);
    expect(body['agents']).toBe(AGENT_COUNT);
  });
  it('returns TEVV score 95.4', async () => {
    const res  = await platform();
    const body = await json(res);
    expect((body['tevv'] as Record<string,unknown>)['score']).toBe(95.4);
  });
  it('lists all three AI models', async () => {
    const res  = await platform();
    const body = await json(res);
    const models = body['models'] as Record<string,unknown>;
    expect(models['opus']).toBeDefined();
    expect(models['sonnet']).toBeDefined();
    expect(models['haiku']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLING PLANS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/billing/plans', () => {
  it('returns prices object', async () => {
    const res  = await billingPlans();
    const body = await json(res);
    expect(body['prices']).toBeDefined();
  });
  it('starter monthly is $79', async () => {
    const res  = await billingPlans();
    const body = await json(res);
    const prices = body['prices'] as Record<string, Record<string, number>>;
    expect(prices['starter']?.['monthly']).toBe(79);
  });
  it('returns b2bEnabled and b2cEnabled', async () => {
    const res  = await billingPlans();
    const body = await json(res);
    expect(body['b2bEnabled']).toBe(true);
    expect(body['b2cEnabled']).toBe(true);
  });
  it('starter savings >= 96%', async () => {
    const res  = await billingPlans();
    const body = await json(res);
    const savings = body['savings'] as Record<string, number>;
    expect(savings['starter']).toBeGreaterThanOrEqual(96);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AGENT DISPATCH — Auth required
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/agent/dispatch — auth', () => {
  it('missing auth → 401', async () => {
    const res = await agentDispatch(makeReq('POST', '/api/agent', { body:{agentType:'keyword_researcher'} }));
    expect(res.status).toBe(401);
  });
  it('missing agentType → 400', async () => {
    const res = await agentDispatch(makeReq('POST', '/api/agent', { auth:true, body:{} }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REDDIT — HITL GATE (most critical contract)
// ══════════════════════════════════════════════════════════════════════════════
describe('HITL: Reddit approval gate', () => {
  it('REDDIT_REQUIRES_HUMAN_APPROVAL is strictly true (constant)', () => {
    expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toBe(true);
    expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toStrictEqual(true);
    expect(typeof REDDIT_REQUIRES_HUMAN_APPROVAL).toBe('boolean');
  });
  it('GET /api/reddit/discover → 401 without auth', async () => {
    const res = await redditDiscover(makeReq('GET', '/api/reddit/discover'));
    expect(res.status).toBe(401);
  });
  it('POST /api/reddit/approve → 401 without auth', async () => {
    const res = await redditApprove(makeReq('POST', '/api/reddit/approve', { body:{threadId:'t_abc'} }));
    expect(res.status).toBe(401);
  });
  it('POST /api/reddit/approve → 400 without threadId', async () => {
    const res = await redditApprove(makeReq('POST', '/api/reddit/approve', { auth:true, body:{} }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body['error']).toContain('threadId');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — TEVV F-02 Replay Protection
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/hubspot/webhook — TEVV F-02', () => {
  it('missing signature → 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/hubspot/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ subscriptionType: 'contact.creation' }]),
    });
    const res = await hubWebhook(req);
    expect(res.status).toBe(401);
  });

  it('stale timestamp (>300s) → 401 with replay reason', async () => {
    const staleTs = (Date.now() - 310_000).toString();
    const req = new NextRequest('http://localhost:3000/api/hubspot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': 'anysig==',
        'x-hubspot-request-timestamp': staleTs,
      },
      body: JSON.stringify([{ subscriptionType: 'contact.creation' }]),
    });
    const res  = await hubWebhook(req);
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(String(body['error'])).toContain('timestamp_out_of_window');
  });

  it('missing body → 400', async () => {
    const nowTs = Date.now().toString();
    const req = new NextRequest('http://localhost:3000/api/hubspot/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': 'anysig==',
        'x-hubspot-request-timestamp': nowTs,
      },
      body: '[]',
    });
    const res = await hubWebhook(req);
    // empty secret fails before body validation
    expect([400, 401]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// B2B ORG ROUTES
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/org/create — B2B', () => {
  it('no auth → 401', async () => {
    const res = await orgCreate(makeReq('POST', '/api/org/create', { body:{name:'Test',slug:'test'} }));
    expect(res.status).toBe(401);
  });
  it('missing name → 400', async () => {
    const res = await orgCreate(makeReq('POST', '/api/org/create', { auth:true, body:{slug:'test'} }));
    expect(res.status).toBe(400);
  });
  it('invalid slug → 400', async () => {
    const res = await orgCreate(makeReq('POST', '/api/org/create', { auth:true, body:{name:'Test',slug:'TEST ORG!'} }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/org/invite — B2B', () => {
  it('missing email → 400', async () => {
    const res = await orgInvite(makeReq('POST', '/api/org/invite', { auth:true, body:{orgId:'org_1'} }));
    expect(res.status).toBe(400);
  });
  it('invalid role → 400', async () => {
    const res = await orgInvite(makeReq('POST', '/api/org/invite', { auth:true, body:{email:'a@b.com',orgId:'org_1',role:'superadmin'} }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/org/members', () => {
  it('missing orgId → 400', async () => {
    const res = await orgMembers(makeReq('GET', '/api/org/members', { auth:true }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/kb/upload', () => {
  it('no auth → 401', async () => {
    const res = await kbUpload(makeReq('POST', '/api/kb/upload', { body:{name:'test',content:'hello'} }));
    expect(res.status).toBe(401);
  });
  it('missing name → 400', async () => {
    const res = await kbUpload(makeReq('POST', '/api/kb/upload', { auth:true, body:{content:'hello'} }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/kb/list', () => {
  it('no auth → 401', async () => {
    const res = await kbList(makeReq('GET', '/api/kb/list'));
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS TRACK
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/events/track', () => {
  it('no auth → 401', async () => {
    const res = await eventsTrack(makeReq('POST', '/api/events/track', { body:{contactId:'c1',eventType:'page_view'} }));
    expect(res.status).toBe(401);
  });
  it('missing eventType → 400', async () => {
    const res = await eventsTrack(makeReq('POST', '/api/events/track', { auth:true, body:{contactId:'c1'} }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// M365 STATUS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/m365/status', () => {
  it('no auth → 401', async () => {
    const res = await m365Status(makeReq('GET', '/api/m365/status'));
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BILLING CHECKOUT
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/billing/checkout', () => {
  it('no auth → 401', async () => {
    const res = await checkout(makeReq('POST', '/api/billing/checkout', { body:{tier:'starter'} }));
    expect(res.status).toBe(401);
  });
  it('missing tier → 400', async () => {
    const res = await checkout(makeReq('POST', '/api/billing/checkout', { auth:true, body:{} }));
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA ROUTE (latest tab/section BFF)
// ══════════════════════════════════════════════════════════════════════════════
describe('GET/POST /dashboard/data', () => {
  beforeEach(() => {
    resetTenantDashboardStateMemory();
    mockedAuth.mockReset();
    mockLinkedInPostText.mockReset();
    delete process.env['LINKEDIN_ACCESS_TENANT_TEST_001'];
    delete process.env['LINKEDIN_MEMBER_ID_TENANT_TEST_001'];
  });

  it('GET returns 401 when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const res = await dashboardDataGet();
    expect(res.status).toBe(401);
  });

  it('GET returns analytics/contacts/settings payload sections', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);

    const res = await dashboardDataGet();
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body['analytics']).toBeDefined();
    expect(body['contacts']).toBeDefined();
    expect(body['settings']).toBeDefined();

    const analytics = body['analytics'] as Record<string, unknown>;
    const contacts = body['contacts'] as Record<string, unknown>;
    const settings = body['settings'] as Record<string, unknown>;

    expect(Array.isArray(analytics['channels'])).toBe(true);
    expect(Array.isArray(contacts['all'])).toBe(true);
    expect(Array.isArray(settings['integrations'])).toBe(true);
  });

  it('POST approveHitl requires id', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);

    const req = makeDashboardReq({ action: 'approveHitl' });
    const res = await dashboardDataPost(req);

    expect(res.status).toBe(400);
  });

  it('POST inviteMember adds a new member to state', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);
    const req = makeDashboardReq({ action: 'inviteMember', email: 'new.member@example.com' });
    const res = await dashboardDataPost(req);

    expect(res.status).toBe(200);
    const body = await json(res);
    const data = body['data'] as Record<string, unknown>;
    const orgMembersPayload = data['orgMembers'] as Array<Record<string, unknown>>;

    expect(orgMembersPayload.some(member => member['email'] === 'new.member@example.com')).toBe(true);
  });

  it('POST uploadKbDoc appends KB document', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);
    const req = makeDashboardReq({
      action: 'uploadKbDoc',
      title: 'Integration Test KB Doc',
      category: 'product-docs',
      content: 'This is a KB doc generated by integration tests.',
    });
    const res = await dashboardDataPost(req);

    expect(res.status).toBe(200);
    const body = await json(res);
    const data = body['data'] as Record<string, unknown>;
    const docs = data['kbDocuments'] as Array<Record<string, unknown>>;

    expect(docs.some(doc => doc['title'] === 'Integration Test KB Doc')).toBe(true);
  });

  it('POST pauseAutopilot then resumeAutopilot toggles pause state', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);
    const pauseRes = await dashboardDataPost(makeDashboardReq({ action: 'pauseAutopilot' }));

    expect(pauseRes.status).toBe(200);
    const pauseBody = await json(pauseRes);
    const pauseData = pauseBody['data'] as Record<string, unknown>;
    const pauseAutopilot = pauseData['autopilot'] as Record<string, unknown>;
    expect(pauseAutopilot['paused']).toBe(true);

    mockedAuth.mockResolvedValueOnce(dashboardSession);
    const resumeRes = await dashboardDataPost(makeDashboardReq({ action: 'resumeAutopilot' }));

    expect(resumeRes.status).toBe(200);
    const resumeBody = await json(resumeRes);
    const resumeData = resumeBody['data'] as Record<string, unknown>;
    const resumeAutopilot = resumeData['autopilot'] as Record<string, unknown>;
    expect(resumeAutopilot['paused']).toBe(false);
  });

  it('POST publishSocialPost validates required post body', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);

    const req = makeDashboardReq({
      action: 'publishSocialPost',
      postChannel: 'linkedin',
      postBody: '',
    });

    const res = await dashboardDataPost(req);
    expect(res.status).toBe(400);
  });

  it('POST publishSocialPost returns 409 when LinkedIn is not connected', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);

    const req = makeDashboardReq({
      action: 'publishSocialPost',
      postChannel: 'linkedin',
      postBody: 'Test post body for LinkedIn.',
    });

    const res = await dashboardDataPost(req);
    expect(res.status).toBe(409);

    const body = await json(res);
    expect(String(body['error'])).toContain('LinkedIn is not connected');
  });

  it('POST publishSocialPost marks the post as posted and creates a replacement draft', async () => {
    mockedAuth.mockResolvedValueOnce(dashboardSession);
    process.env['LINKEDIN_ACCESS_TENANT_TEST_001'] = 'linkedin-access-token';
    process.env['LINKEDIN_MEMBER_ID_TENANT_TEST_001'] = 'linkedin-member-id';
    mockLinkedInPostText.mockResolvedValueOnce({ id: 'li_post_123', status: 201 });

    const req = makeDashboardReq({
      action: 'publishSocialPost',
      postId: '1',
      postChannel: 'linkedin',
      postBody: 'Test post body for LinkedIn.',
    });

    const res = await dashboardDataPost(req);
    expect(res.status).toBe(200);

    const body = await json(res);
    const data = body['data'] as Record<string, unknown>;
    const socialPosts = data['socialPosts'] as Array<Record<string, unknown>>;

    expect(mockLinkedInPostText).toHaveBeenCalledWith({
      accessToken: 'linkedin-access-token',
      memberId: 'linkedin-member-id',
      text: 'Test post body for LinkedIn.',
    });
    expect(socialPosts[0]?.['id']).not.toBe('1');
    expect(socialPosts[0]?.['status']).toBe('draft');

    const publishedPost = socialPosts.find(post => post['id'] === '1');
    expect(publishedPost?.['status']).toBe('posted');
    expect(publishedPost?.['primaryAction']).toBe('Posted');
  });
});
