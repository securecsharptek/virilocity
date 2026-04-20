// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Unit Tests: Types · Utils · AI Client · B2B/B2C Tiers
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  VERSION, CODENAME, PLATFORM, AGENT_COUNT, DB_TABLES,
  PRICES, GOMEGA_REF, TIER_LIMITS, MODELS, HAIKU_AGENTS,
  REDDIT_REQUIRES_HUMAN_APPROVAL, WEBHOOK_REPLAY_WINDOW_SECONDS,
  TEVV_FIXES, ok, err,
} from '../../lib/types/index';
import { uid, clamp, round2, trunc, safeJSON, withinLimit, CircuitBreaker } from '../../lib/utils/index';
import { routeModel, CONTENT_AGENTS } from '../../lib/ai/client';

// ── Platform constants ────────────────────────────────────────────────────────
describe('Platform constants', () => {
  it('VERSION is 16.4.0',                  () => expect(VERSION).toBe('16.4.0'));
  it('CODENAME is Apex-Omniscient-Vercel', () => expect(CODENAME).toBe('Apex-Omniscient-Vercel'));
  it('PLATFORM is vercel-multicloud',      () => expect(PLATFORM).toBe('vercel-multicloud'));
  it('AGENT_COUNT is 39',                  () => expect(AGENT_COUNT).toBe(39));
  it('DB_TABLES is 17',                    () => expect(DB_TABLES).toBe(17));
  it('WEBHOOK_REPLAY_WINDOW_SECONDS is 300',() => expect(WEBHOOK_REPLAY_WINDOW_SECONDS).toBe(300));
  it('REDDIT_REQUIRES_HUMAN_APPROVAL is true', () => expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toBe(true));
  it('REDDIT_REQUIRES_HUMAN_APPROVAL is strictly true', () => expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toStrictEqual(true));
});

// ── TEVV fix registry ─────────────────────────────────────────────────────────
describe('TEVV Fix Registry — 7 remediations documented', () => {
  const fixes = ['F-01','F-02','F-03','F-04','BIAS','VISUAL','SBOM'] as const;
  fixes.forEach(key => it(`${key} is documented`, () => expect(TEVV_FIXES[key]).toBeTruthy()));
});

// ── Pricing ───────────────────────────────────────────────────────────────────
describe('V14.3 Pricing', () => {
  it('Free is $0',        () => expect(PRICES.free.monthly).toBe(0));
  it('Starter is $79',    () => expect(PRICES.starter.monthly).toBe(79));
  it('Pro is $399',       () => expect(PRICES.pro.monthly).toBe(399));
  it('Growth is $699',    () => expect(PRICES.growth.monthly).toBe(699));
  it('Scale is $999',     () => expect(PRICES.scale.monthly).toBe(999));
  it('Enterprise is $0',  () => expect(PRICES.enterprise.monthly).toBe(0));
  it('Annual always ≤ monthly', () =>
    (['starter','pro','growth','scale'] as const).forEach(t =>
      expect(PRICES[t].annual).toBeLessThanOrEqual(PRICES[t].monthly)));
  it('Price order: starter < pro < growth < scale', () => {
    expect(PRICES.starter.monthly).toBeLessThan(PRICES.pro.monthly);
    expect(PRICES.pro.monthly).toBeLessThan(PRICES.growth.monthly);
    expect(PRICES.growth.monthly).toBeLessThan(PRICES.scale.monthly);
  });
  it('Starter ≥96% cheaper than GoMega full ($2378)', () => {
    const savings = Math.round((1 - PRICES.starter.monthly / GOMEGA_REF.full) * 100);
    expect(savings).toBeGreaterThanOrEqual(96);
  });
  it('GoMega full = bundle + website', () =>
    expect(GOMEGA_REF.full).toBe(GOMEGA_REF.bundle + GOMEGA_REF.website));
});

// ── B2B/B2C Tier Limits ───────────────────────────────────────────────────────
describe('B2B Tier Limits', () => {
  it('Free: 1 seat (B2C individual)',   () => expect(TIER_LIMITS.free.seats).toBe(1));
  it('Starter: 1 seat (B2C)',           () => expect(TIER_LIMITS.starter.seats).toBe(1));
  it('Pro: 5 seats (small team)',       () => expect(TIER_LIMITS.pro.seats).toBe(5));
  it('Growth: 20 seats',               () => expect(TIER_LIMITS.growth.seats).toBe(20));
  it('Scale: 100 seats',               () => expect(TIER_LIMITS.scale.seats).toBe(100));
  it('Enterprise: unlimited (-1)',     () => expect(TIER_LIMITS.enterprise.seats).toBe(-1));
  it('Free: no B2B org',               () => expect(TIER_LIMITS.free.b2bOrg).toBe(false));
  it('Starter: no B2B org',            () => expect(TIER_LIMITS.starter.b2bOrg).toBe(false));
  it('Pro: B2B org enabled',           () => expect(TIER_LIMITS.pro.b2bOrg).toBe(true));
  it('Only Enterprise: SAML SSO',      () => {
    expect(TIER_LIMITS.enterprise.samlSso).toBe(true);
    expect(TIER_LIMITS.growth.samlSso).toBe(false);
    expect(TIER_LIMITS.scale.samlSso).toBe(false);
  });
  it('Growth+: advanced analytics',   () => {
    expect(TIER_LIMITS.growth.advancedAnalytics).toBe(true);
    expect(TIER_LIMITS.starter.advancedAnalytics).toBe(false);
  });
  it('Starter+: Vercel Edge',          () => {
    expect(TIER_LIMITS.starter.vercelEdge).toBe(true);
    expect(TIER_LIMITS.free.vercelEdge).toBe(false);
  });
  it('Growth+: all 39 agents (-1)',    () => {
    expect(TIER_LIMITS.growth.agentsEnabled).toBe(-1);
    expect(TIER_LIMITS.scale.agentsEnabled).toBe(-1);
    expect(TIER_LIMITS.enterprise.agentsEnabled).toBe(-1);
  });
  it('Free: 3 agents only',            () => expect(TIER_LIMITS.free.agentsEnabled).toBe(3));
  it('Starter: 10 agents',             () => expect(TIER_LIMITS.starter.agentsEnabled).toBe(10));
  it('Pro: 20 agents',                 () => expect(TIER_LIMITS.pro.agentsEnabled).toBe(20));
  it('Free: 0 KB storage',             () => expect(TIER_LIMITS.free.kbStorageGb).toBe(0));
  it('Enterprise: unlimited KB (-1)',  () => expect(TIER_LIMITS.enterprise.kbStorageGb).toBe(-1));
  it('Growth: all 7 GEO engines',      () => expect(TIER_LIMITS.growth.geoEngines).toBe(7));
});

// ── AI Model Routing ──────────────────────────────────────────────────────────
describe('AI Model Routing', () => {
  it('Enterprise → Opus',                    () => expect(routeModel('keyword_researcher','enterprise')).toBe(MODELS.opus));
  it('Haiku agent + non-enterprise → Haiku', () => expect(routeModel('social_listener','pro')).toBe(MODELS.haiku));
  it('All 6 Haiku agents routed correctly',  () => {
    const haiku = ['social_listener','ai_visibility_tracker','reddit_manager','trend_detector','knowledge_base_curator','workspace_reporter'];
    haiku.forEach(a => expect(routeModel(a as any,'pro')).toBe(MODELS.haiku));
  });
  it('Non-haiku + non-enterprise → Sonnet',  () => expect(routeModel('geo_content_generator','pro')).toBe(MODELS.sonnet));
  it('Enterprise overrides Haiku routing',    () => expect(routeModel('social_listener','enterprise')).toBe(MODELS.opus));
  it('HAIKU_AGENTS has exactly 6 entries',   () => expect(HAIKU_AGENTS.size).toBe(6));
});

// ── Content Agents (Fairness filter) ─────────────────────────────────────────
describe('CONTENT_AGENTS — fairness filter targets', () => {
  const expected = ['geo_content_generator','ad_creative_generator','email_sequencer','brand_voice_enforcer','content_repurposer','landing_page_optimizer'];
  it('has exactly 6 content agents',  () => expect(CONTENT_AGENTS.size).toBe(6));
  expected.forEach(a => it(`includes ${a}`, () => expect(CONTENT_AGENTS.has(a as any)).toBe(true)));
  it('does not include keyword_researcher', () => expect(CONTENT_AGENTS.has('keyword_researcher')).toBe(false));
  it('does not include churn_predictor',    () => expect(CONTENT_AGENTS.has('churn_predictor')).toBe(false));
});

// ── Result type ───────────────────────────────────────────────────────────────
describe('Result<T,E> helpers', () => {
  it('ok() returns {ok:true, value}',  () => { const r=ok(42); expect(r.ok).toBe(true); expect(r.value).toBe(42); });
  it('err() returns {ok:false, error}',() => { const r=err('fail'); expect(r.ok).toBe(false); expect(r.error).toBe('fail'); });
});

// ── Utils ─────────────────────────────────────────────────────────────────────
describe('Shared utilities', () => {
  it('uid() returns string starting with prefix', () => expect(uid('test')).toMatch(/^test_/));
  it('uid() is unique across calls',              () => expect(uid()).not.toBe(uid()));
  it('clamp(5,0,10) = 5',    () => expect(clamp(5,0,10)).toBe(5));
  it('clamp(-5,0,10) = 0',   () => expect(clamp(-5,0,10)).toBe(0));
  it('clamp(15,0,10) = 10',  () => expect(clamp(15,0,10)).toBe(10));
  it('round2(3.14159) = 3.14',() => expect(round2(3.14159)).toBe(3.14));
  it('trunc truncates long strings',() => { const s='a'.repeat(300); expect(trunc(s,200).length).toBe(201); });
  it('trunc leaves short strings',  () => expect(trunc('hello',200)).toBe('hello'));
  it('safeJSON parses valid JSON',  () => expect(safeJSON<{a:number}>('{"a":1}')).toEqual({a:1}));
  it('safeJSON returns null on bad JSON', () => expect(safeJSON('not json')).toBeNull());
  it('withinLimit: -1 is unlimited',   () => expect(withinLimit(999,-1)).toBe(true));
  it('withinLimit: 5 < 10 = true',     () => expect(withinLimit(5,10)).toBe(true));
  it('withinLimit: 10 >= 10 = false',  () => expect(withinLimit(10,10)).toBe(false));
});

// ── Circuit Breaker ───────────────────────────────────────────────────────────
describe('CircuitBreaker', () => {
  it('allows calls when closed',    async () => {
    const cb = new CircuitBreaker(3, 1000);
    const r  = await cb.call(() => Promise.resolve('ok'));
    expect(r).toBe('ok');
  });
  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker(2, 1000);
    for (let i=0;i<2;i++) { try { await cb.call(()=>Promise.reject(new Error('fail'))); } catch {} }
    expect(cb.isOpen).toBe(true);
  });
  it('reset() closes breaker',        async () => {
    const cb = new CircuitBreaker(1, 1000);
    try { await cb.call(()=>Promise.reject(new Error('fail'))); } catch {}
    cb.reset();
    expect(cb.isOpen).toBe(false);
  });
  it('open breaker throws immediately', async () => {
    const cb = new CircuitBreaker(1, 60_000);
    try { await cb.call(()=>Promise.reject(new Error('fail'))); } catch {}
    await expect(cb.call(()=>Promise.resolve('ok'))).rejects.toThrow('Circuit breaker OPEN');
  });
});
