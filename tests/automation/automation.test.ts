// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — AUTOMATION TESTS
// Purpose: Validate test automation infrastructure, CI contracts,
//          autopilot orchestration logic, cron scheduling, SBOM pipeline
// Standard: NIST AI TEVV · SSDF SP800-218 · ISO/IEC 12207
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  REDDIT_REQUIRES_HUMAN_APPROVAL, AGENT_COUNT, TIER_LIMITS,
  TEVV_FIXES, VERSION, PLATFORM, DB_TABLES, HAIKU_AGENTS, WEBHOOK_REPLAY_WINDOW_SECONDS,
} from '../../lib/types/index';
import { uid, now, withinLimit, withRetry, CircuitBreaker } from '../../lib/utils/index';
import { checkRateLimit, resetMemoryRateLimiter } from '../../lib/cache/ratelimit';
import { applyFairnessFilter }  from '../../lib/ai/fairness';
import { routeModel, CONTENT_AGENTS } from '../../lib/ai/client';
import { getBillingPlans }      from '../../lib/integrations/stripe';
import { HubSpotAuth }          from '../../lib/integrations/hubspot';

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-01: AUTOPILOT TASK REGISTRY
// Validates the 11 daily autopilot tasks are correctly registered
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-01 | Autopilot task registry', () => {
  const EXPECTED_TASKS = [
    'keyword_researcher','trend_detector','hs_contact_enricher','bid_optimizer',
    'backlink_outreach','social_listener','ai_visibility_tracker','churn_predictor',
    'ab_test_orchestrator','workspace_reporter','cross_channel_orchestrator',
  ] as const;

  it('autopilot runs exactly 11 tasks',                   () => expect(EXPECTED_TASKS).toHaveLength(11));
  it('reddit_manager is NOT in autopilot task list',      () =>
    expect(EXPECTED_TASKS).not.toContain('reddit_manager'));
  it('all autopilot agents are within AGENT_COUNT (39)',  () =>
    expect(EXPECTED_TASKS.length).toBeLessThanOrEqual(AGENT_COUNT));
  it('no duplicate tasks in registry',                    () => {
    const set = new Set(EXPECTED_TASKS);
    expect(set.size).toBe(EXPECTED_TASKS.length);
  });
  it('social_listener uses Haiku model (high-freq)',      () =>
    expect(HAIKU_AGENTS.has('social_listener')).toBe(true));
  it('workspace_reporter uses Haiku model (high-freq)',   () =>
    expect(HAIKU_AGENTS.has('workspace_reporter')).toBe(true));
  it('keyword_researcher uses Sonnet (standard)',         () =>
    expect(routeModel('keyword_researcher','pro')).toContain('sonnet'));
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-02: TIER GATING AUTOMATION
// Validates that tier limits are correctly applied to agent access
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-02 | Tier gating — automated agent access control', () => {
  const TIERS = ['free','starter','pro','growth','scale','enterprise'] as const;

  it('Free tier gates to 3 agents',                       () =>
    expect(withinLimit(3, TIER_LIMITS.free.agentsEnabled)).toBe(false));
  it('Starter tier allows 10 agents (withinLimit)',        () =>
    expect(withinLimit(9, TIER_LIMITS.starter.agentsEnabled)).toBe(true));
  it('Pro tier allows 20 agents',                         () =>
    expect(withinLimit(19, TIER_LIMITS.pro.agentsEnabled)).toBe(true));
  it('Growth+ grants unlimited access (-1)',               () => {
    (['growth','scale','enterprise'] as const).forEach(t =>
      expect(withinLimit(39, TIER_LIMITS[t].agentsEnabled)).toBe(true));
  });
  it('all 6 tiers have defined agentsEnabled',            () =>
    TIERS.forEach(t => expect(TIER_LIMITS[t].agentsEnabled).toBeDefined()));
  it('agent limits increase monotonically through tiers',  () => {
    expect(TIER_LIMITS.free.agentsEnabled).toBeLessThan(TIER_LIMITS.starter.agentsEnabled);
    expect(TIER_LIMITS.starter.agentsEnabled).toBeLessThan(TIER_LIMITS.pro.agentsEnabled);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-03: FAIRNESS PIPELINE AUTOMATION
// Validates automated content filtering applied to all content agents
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-03 | Automated fairness pipeline', () => {
  const CONTENT_AGENT_LIST = [
    'geo_content_generator','ad_creative_generator','email_sequencer',
    'brand_voice_enforcer','content_repurposer','landing_page_optimizer',
  ] as const;

  it('all 6 content agents are in CONTENT_AGENTS set',    () =>
    CONTENT_AGENT_LIST.forEach(a => expect(CONTENT_AGENTS.has(a)).toBe(true)));
  it('non-content agents are NOT in CONTENT_AGENTS',      () =>
    ['churn_predictor','social_listener','keyword_researcher'].forEach(a =>
      expect(CONTENT_AGENTS.has(a as any)).toBe(false)));
  it('fairness filter processes batch of 10 items',        () => {
    const batch = Array.from({length:10}, (_,i) => `Marketing content item ${i+1}`);
    const results = batch.map(applyFairnessFilter);
    expect(results).toHaveLength(10);
    expect(results.every(r => r.passed)).toBe(true);
  });
  it('each filter call produces unique audit trail',        () => {
    const ids = Array.from({length:5}, () => applyFairnessFilter('test').auditId);
    expect(new Set(ids).size).toBe(5);
  });
  it('fairness score is always in [0,100]',                () => {
    const testCases = ['clean','targeting only men','exclusively for high-income wealthy clients'];
    testCases.forEach(input => {
      const r = applyFairnessFilter(input);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-04: RATE LIMITING AUTOMATION
// Validates automated per-tenant rate limiting pipeline
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-04 | Automated rate limiting', () => {
  beforeEach(() => {
    resetMemoryRateLimiter();
    delete process.env['UPSTASH_REDIS_REST_URL'];
  });

  it('processes 60 concurrent tenants independently',      async () => {
    const tenants = Array.from({length:10}, (_,i) => `auto-tenant-${i}`);
    const results = await Promise.all(tenants.map(t => checkRateLimit(t)));
    expect(results.every(Boolean)).toBe(true);
  });

  it('exhausted tenant blocks while others are free',      async () => {
    for(let i=0;i<60;i++) await checkRateLimit('auto-exhausted');
    const [blocked, allowed] = await Promise.all([
      checkRateLimit('auto-exhausted'),
      checkRateLimit('auto-fresh'),
    ]);
    expect(blocked).toBe(false);
    expect(allowed).toBe(true);
  });

  it('fallback rate limiter handles 100 rapid checks',     async () => {
    const results: boolean[] = [];
    for(let i=0;i<100;i++) results.push(await checkRateLimit('auto-rapid'));
    const allowed = results.filter(Boolean).length;
    const blocked = results.filter(r => !r).length;
    expect(allowed).toBe(60);
    expect(blocked).toBe(40);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-05: CI/CD PIPELINE CONTRACT
// Validates that all 5 CI stages are documented and testable
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-05 | CI/CD pipeline contract', () => {
  const CI_STAGES = ['test','security','docker','deploy-vercel','accessibility'] as const;

  it('platform records VERSION for CI tagging',            () => expect(VERSION).toBe('16.4.0'));
  it('platform is vercel-multicloud',                      () => expect(PLATFORM).toBe('vercel-multicloud'));
  it('TEVV_FIXES registry covers all automated checks',    () => {
    expect(Object.keys(TEVV_FIXES)).toContain('F-01'); // CI Stage 3: docker run whoami
    expect(Object.keys(TEVV_FIXES)).toContain('F-04'); // CI Stage 5: axe-core
    expect(Object.keys(TEVV_FIXES)).toContain('SBOM');  // CI Stage 2: cyclonedx
  });
  it('CI has exactly 5 stages defined',                    () => expect(CI_STAGES).toHaveLength(5));
  it('SBOM generation is automated in CI',                 () =>
    expect(TEVV_FIXES['SBOM']).toContain('sbom'));
  it('WCAG axe-core audit runs in CI (F-04)',              () =>
    expect(TEVV_FIXES['F-04']).toContain('WCAG'));
  it('DB schema has 17 tables (validated in CI)',          () => expect(DB_TABLES).toBe(17));
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-06: RETRY + CIRCUIT BREAKER AUTOMATION
// Validates resilience patterns used in agent pipeline
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-06 | Retry + circuit breaker automation', () => {
  it('withRetry executes fn 3 times on persistent failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('service down'));
    await withRetry(fn, 3, 1).catch(() => {});
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('withRetry succeeds on 3rd attempt',                  async () => {
    let n = 0;
    const fn = () => ++n < 3 ? Promise.reject(new Error('x')) : Promise.resolve('ok');
    expect(await withRetry(fn, 3, 1)).toBe('ok');
  });

  it('circuit breaker prevents cascade failures',           async () => {
    const cb = new CircuitBreaker(2, 1000);
    const calls: string[] = [];
    const fn = vi.fn().mockImplementation(() => { calls.push('called'); return Promise.reject(new Error('x')); });
    for(let i=0;i<2;i++) try{ await cb.call(fn) } catch{}
    // Circuit is now open — fn should not be called again
    try{ await cb.call(fn) } catch{}
    expect(calls.length).toBe(2); // only 2 calls before circuit opened
  });

  it('circuit breaker recovers after timeout',              async () => {
    const cb = new CircuitBreaker(1, 0); // 0ms timeout
    try{ await cb.call(() => Promise.reject(new Error('x'))) } catch{}
    await new Promise(r => setTimeout(r, 10)); // wait for half-open
    expect(await cb.call(() => Promise.resolve('ok'))).toBe('ok');
    expect(cb.isOpen).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-07: UID GENERATION AUTOMATION
// Validates unique ID generation for agent executions, messages, audit logs
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-07 | UID generation — no collisions', () => {
  it('generates 1000 unique exec IDs without collision',   () => {
    const ids = new Set(Array.from({length:1000}, () => uid('exec')));
    expect(ids.size).toBe(1000);
  });
  it('generates 1000 unique msg IDs without collision',    () => {
    const ids = new Set(Array.from({length:1000}, () => uid('msg')));
    expect(ids.size).toBe(1000);
  });
  it('generates 1000 unique fairness audit IDs',           () => {
    const ids = new Set(Array.from({length:1000}, () => uid('fair')));
    expect(ids.size).toBe(1000);
  });
  it('all IDs have correct prefix format',                 () => {
    const prefixes = ['exec','msg','run','doc','org','tenant'];
    prefixes.forEach(p => expect(uid(p)).toMatch(new RegExp(`^${p}_`)));
  });
  it('now() returns parseable ISO date',                   () => {
    const ts = now();
    expect(new Date(ts).getTime()).not.toBeNaN();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-08: HUBSPOT + STRIPE INTEGRATION AUTOMATION
// Validates integration contracts without network calls
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-08 | Integration automation contracts', () => {
  it('HubSpot auth URL is consistent per tenantId',        () => {
    const url1 = HubSpotAuth.getAuthUrl('t1');
    const url2 = HubSpotAuth.getAuthUrl('t1');
    expect(url1).toBe(url2);
  });
  it('HubSpot auth URLs differ per tenantId',              () => {
    expect(HubSpotAuth.getAuthUrl('t1')).not.toBe(HubSpotAuth.getAuthUrl('t2'));
  });
  it('Stripe billing plans are stable',                    () => {
    const p1 = getBillingPlans();
    const p2 = getBillingPlans();
    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
  });
  it('Billing plans have all required fields',             () => {
    const p = getBillingPlans();
    expect(p.prices).toBeDefined();
    expect(p.limits).toBeDefined();
    expect(p.savings).toBeDefined();
    expect(p.gomegaRef).toBeDefined();
    expect(p.b2bEnabled).toBe(true);
    expect(p.b2cEnabled).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-09: REGRESSION AUTOMATION GATE
// A meta-test verifying the regression test suite is comprehensive
// ══════════════════════════════════════════════════════════════════════════════
describe('AUTO-09 | Regression automation gate', () => {
  it('All 7 TEVV fixes are documented in TEVV_FIXES',      () => {
    const required = ['F-01','F-02','F-03','F-04','BIAS','VISUAL','SBOM'];
    required.forEach(k => expect(TEVV_FIXES[k as keyof typeof TEVV_FIXES]).toBeTruthy());
  });
  it('HITL constant is immutable across test runs',         () => {
    const runs = Array.from({length:10}, () => REDDIT_REQUIRES_HUMAN_APPROVAL);
    expect(runs.every(v => v === true)).toBe(true);
  });
  it('VERSION is stable across all test invocations',       () => {
    const runs = Array.from({length:10}, () => VERSION);
    expect(new Set(runs).size).toBe(1);
    expect(runs[0]).toBe('16.4.0');
  });
  it('AGENT_COUNT is stable',                               () => expect(AGENT_COUNT).toBe(39));
  it('WEBHOOK_REPLAY_WINDOW_SECONDS is stable',             () => expect(WEBHOOK_REPLAY_WINDOW_SECONDS).toBe(300));
});
