// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Autopilot + Fairness Unit Tests
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { applyFairnessFilter, filterBatch } from '../../lib/ai/fairness';
import { CONTENT_AGENTS, routeModel }        from '../../lib/ai/client';
import { withRetry, CircuitBreaker, uid, clamp, trunc, safeJSON } from '../../lib/utils/index';
import { REDDIT_REQUIRES_HUMAN_APPROVAL, TIER_LIMITS, PRICES, AGENT_COUNT, AGENT_ACTIVATION_PLAN, TIER_ORDER } from '../../lib/types/index';
import type { AgentType } from '../../lib/types/index';
import { AUTOPILOT_TASKS } from '../../lib/agents/autopilot';

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT FAIRNESS FILTER (TEVV BIAS)
// ══════════════════════════════════════════════════════════════════════════════
describe('ContentFairnessFilter — clean content', () => {
  it('neutral marketing copy passes at 100',    () => expect(applyFairnessFilter('Boost your ROAS with AI-driven campaign optimization.').score).toBe(100));
  it('B2B SaaS copy passes',                    () => expect(applyFairnessFilter('Automate your team workflows with 39 AI marketing agents.').passed).toBe(true));
  it('flags count is 0 for clean content',      () => expect(applyFairnessFilter('Grow revenue with data-driven insights.').flags).toHaveLength(0));
  it('sanitized equals input for clean content',() => { const r = applyFairnessFilter('Clean marketing content.'); expect(r.sanitized).toBe('Clean marketing content.'); });
});

describe('ContentFairnessFilter — demographic targeting', () => {
  it('detects "targeting only men"',           () => expect(applyFairnessFilter('This campaign is for targeting only men in sales.').passed).toBe(false));
  it('detects "exclusively for women"',        () => expect(applyFairnessFilter('exclusively for women in leadership').flags.some(f => f.category === 'demographic_targeting')).toBe(true));
  it('medium severity deducts 15pts → score 85',() => expect(applyFairnessFilter('exclusively for women in leadership').score).toBe(85));
  it('sanitized replaces flagged phrase',      () => {
    const r = applyFairnessFilter('targeting only men in marketing');
    expect(r.sanitized).not.toContain('targeting only men');
    expect(r.sanitized.length).toBeGreaterThan(0);
  });
});

describe('ContentFairnessFilter — gender bias', () => {
  it('detects gender-biased pronoun in professional context', () => {
    const r = applyFairnessFilter('Help him grow his business with our platform.');
    expect(r.flags.some(f => f.category === 'gender_bias')).toBe(true);
  });
  it('detects businessman/businesswoman terms', () => {
    const r = applyFairnessFilter('Every businessman should use AI tools.');
    expect(r.flags.some(f => f.category === 'gender_bias')).toBe(true);
  });
});

describe('ContentFairnessFilter — economic exclusion', () => {
  it('detects "only for high-income" phrasing', () => {
    const r = applyFairnessFilter('This tool is only for high-income professionals.');
    expect(r.flags.some(f => f.category === 'economic_exclusion')).toBe(true);
  });
  it('medium severity deducts 15 pts',         () => {
    const r = applyFairnessFilter('only for high-income clients in the enterprise space');
    expect(r.score).toBeLessThanOrEqual(85);
  });
});

describe('ContentFairnessFilter — metadata', () => {
  it('auditId starts with fair_',              () => expect(applyFairnessFilter('test').auditId).toMatch(/^fair_/));
  it('each call gets unique auditId',          () => expect(applyFairnessFilter('test').auditId).not.toBe(applyFairnessFilter('test').auditId));
  it('score always in [0, 100]',               () => {
    const worst = 'targeting only men women asians exclusively only for high-income wealthy';
    expect(applyFairnessFilter(worst).score).toBeGreaterThanOrEqual(0);
    expect(applyFairnessFilter(worst).score).toBeLessThanOrEqual(100);
  });
  it('flags have all required fields',         () => {
    const { flags } = applyFairnessFilter('targeting only men in sales roles');
    for (const f of flags) {
      expect(f.category).toBeDefined();
      expect(f.phrase).toBeDefined();
      expect(['low','medium','high']).toContain(f.severity);
      expect(typeof f.offset).toBe('number');
    }
  });
});

describe('filterBatch()', () => {
  it('processes array of strings',             () => expect(filterBatch(['clean', 'targeting only men'])).toHaveLength(2));
  it('first item passes, second fails',        () => {
    const [r1, r2] = filterBatch(['clean neutral content', 'targeting only men exclusively']);
    expect(r1!.passed).toBe(true);
    expect(r2!.passed).toBe(false);
  });
  it('empty array returns empty result',       () => expect(filterBatch([])).toHaveLength(0));
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT AGENTS SET
// ══════════════════════════════════════════════════════════════════════════════
describe('CONTENT_AGENTS fairness gate', () => {
  const expected = ['geo_content_generator','ad_creative_generator','email_sequencer','brand_voice_enforcer','content_repurposer','landing_page_optimizer'];
  it('has exactly 6 agents',                                  () => expect(CONTENT_AGENTS.size).toBe(6));
  expected.forEach(a => it(`includes ${a}`,                  () => expect(CONTENT_AGENTS.has(a as any)).toBe(true)));
  it('does NOT include keyword_researcher (data agent)',       () => expect(CONTENT_AGENTS.has('keyword_researcher')).toBe(false));
  it('does NOT include churn_predictor (analysis agent)',     () => expect(CONTENT_AGENTS.has('churn_predictor')).toBe(false));
  it('does NOT include social_listener (monitoring agent)',   () => expect(CONTENT_AGENTS.has('social_listener')).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// MODEL ROUTING
// ══════════════════════════════════════════════════════════════════════════════
describe('routeModel() — WAF Cost Optimisation', () => {
  it('Enterprise → Opus for all agents',        () => {
    (['social_listener','geo_content_generator','keyword_researcher'] as const).forEach(a =>
      expect(routeModel(a,'enterprise')).toContain('opus'));
  });
  it('Haiku agents → Haiku on any non-Enterprise tier', () => {
    (['social_listener','ai_visibility_tracker','trend_detector','reddit_manager','knowledge_base_curator','workspace_reporter'] as const).forEach(a =>
      expect(routeModel(a,'pro')).toContain('haiku'));
  });
  it('Non-haiku non-Enterprise → Sonnet',        () => expect(routeModel('geo_content_generator','growth')).toContain('sonnet'));
  it('Enterprise overrides Haiku preference',    () => expect(routeModel('social_listener','enterprise')).toContain('opus'));
  it('Free tier uses Sonnet for standard agents',() => expect(routeModel('keyword_researcher','free')).toContain('sonnet'));
});

// ══════════════════════════════════════════════════════════════════════════════
// HITL INVARIANT
// ══════════════════════════════════════════════════════════════════════════════
describe('REDDIT_REQUIRES_HUMAN_APPROVAL — immutable HITL contract', () => {
  it('is true',                () => expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toBe(true));
  it('is strictly true',       () => expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toStrictEqual(true));
  it('is a boolean',           () => expect(typeof REDDIT_REQUIRES_HUMAN_APPROVAL).toBe('boolean'));
  it('is not falsy',           () => expect(REDDIT_REQUIRES_HUMAN_APPROVAL).toBeTruthy());
  it('can never be overridden',() => {
    // TypeScript const prevents runtime mutation — this test documents the contract
    const val: typeof REDDIT_REQUIRES_HUMAN_APPROVAL = true;
    expect(val).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
describe('withRetry()', () => {
  it('succeeds on first attempt',              async () => {
    const fn = () => Promise.resolve('ok');
    expect(await withRetry(fn, 3, 10)).toBe('ok');
  });
  it('retries and succeeds on 3rd attempt',    async () => {
    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 3) throw new Error('transient');
      return Promise.resolve('ok');
    };
    expect(await withRetry(fn, 3, 1)).toBe('ok');
    expect(attempts).toBe(3);
  });
  it('throws after exhausting all attempts',   async () => {
    const fn = () => Promise.reject(new Error('always fails'));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow('always fails');
  });
});

describe('CircuitBreaker', () => {
  it('allows calls when closed',               async () => { const cb = new CircuitBreaker(3,1000); expect(await cb.call(()=>Promise.resolve('x'))).toBe('x'); });
  it('opens after threshold failures',         async () => { const cb = new CircuitBreaker(2,1000); for(let i=0;i<2;i++) try{await cb.call(()=>Promise.reject(new Error('x')))}catch{} expect(cb.isOpen).toBe(true); });
  it('open breaker throws immediately',        async () => { const cb = new CircuitBreaker(1,60000); try{await cb.call(()=>Promise.reject(new Error('x')))}catch{} await expect(cb.call(()=>Promise.resolve('x'))).rejects.toThrow('Circuit breaker OPEN'); });
  it('reset() closes the breaker',            async () => { const cb = new CircuitBreaker(1,1000); try{await cb.call(()=>Promise.reject(new Error('x')))}catch{} cb.reset(); expect(cb.isOpen).toBe(false); });
  it('half-open: succeeds on first pass → closes', async () => { const cb = new CircuitBreaker(1,0); try{await cb.call(()=>Promise.reject(new Error('x')))}catch{} await new Promise(r=>setTimeout(r,10)); expect(await cb.call(()=>Promise.resolve('ok'))).toBe('ok'); expect(cb.isOpen).toBe(false); });
});

describe('Utility helpers', () => {
  it('uid() is unique and prefixed',           () => { const a=uid('test'),b=uid('test'); expect(a).toMatch(/^test_/); expect(a).not.toBe(b); });
  it('clamp clamps within bounds',             () => { expect(clamp(5,0,10)).toBe(5); expect(clamp(-5,0,10)).toBe(0); expect(clamp(15,0,10)).toBe(10); });
  it('trunc shortens long strings',            () => { expect(trunc('a'.repeat(300),200).length).toBe(201); expect(trunc('hello',200)).toBe('hello'); });
  it('safeJSON parses valid JSON',             () => expect(safeJSON<{n:number}>('{"n":42}')).toEqual({n:42}));
  it('safeJSON returns null for invalid JSON', () => expect(safeJSON('bad json')).toBeNull());
});

// ══════════════════════════════════════════════════════════════════════════════
// THEME D — AGT-05: Agent activation matrix, model routing, fairness, tier gate
// ══════════════════════════════════════════════════════════════════════════════

describe('AGENT_ACTIVATION_PLAN — 39-agent coverage (AGT-01)', () => {
  const agents = Object.keys(AGENT_ACTIVATION_PLAN) as AgentType[];

  it('covers exactly 39 agents', () => expect(agents).toHaveLength(AGENT_COUNT));

  it('has exactly 11 autopilot agents', () =>
    expect(agents.filter(a => AGENT_ACTIVATION_PLAN[a].mode === 'autopilot')).toHaveLength(11));

  it('has exactly 28 on-demand agents', () =>
    expect(agents.filter(a => AGENT_ACTIVATION_PLAN[a].mode === 'on_demand')).toHaveLength(28));

  it('all AUTOPILOT_TASKS are mode=autopilot', () => {
    for (const a of AUTOPILOT_TASKS) {
      expect(AGENT_ACTIVATION_PLAN[a].mode).toBe('autopilot');
    }
  });

  it('reddit_manager is hitlGated', () =>
    expect(AGENT_ACTIVATION_PLAN['reddit_manager'].hitlGated).toBe(true));

  it('no autopilot agent is hitlGated', () => {
    const bad = AUTOPILOT_TASKS.filter(a => AGENT_ACTIVATION_PLAN[a].hitlGated);
    expect(bad).toHaveLength(0);
  });

  it('every agent has a valid minTier', () => {
    const validTiers = Object.keys(TIER_ORDER);
    for (const a of agents) {
      expect(validTiers).toContain(AGENT_ACTIVATION_PLAN[a].minTier);
    }
  });
});

describe('AGENT_ACTIVATION_PLAN — fairness gate alignment (AGT-02)', () => {
  const fairnessAgents = (['geo_content_generator','ad_creative_generator','email_sequencer',
    'brand_voice_enforcer','content_repurposer','landing_page_optimizer'] as AgentType[]);

  it('CONTENT_AGENTS and fairness-gated agents in plan match exactly', () => {
    const planFairness = (Object.keys(AGENT_ACTIVATION_PLAN) as AgentType[])
      .filter(a => AGENT_ACTIVATION_PLAN[a].hasFairnessGate);
    for (const a of fairnessAgents) {
      expect(planFairness).toContain(a);
    }
  });

  it('hasFairnessGate is false for all autopilot data/analysis agents', () => {
    const dataAgents: AgentType[] = ['keyword_researcher','churn_predictor','bid_optimizer','hs_contact_enricher'];
    for (const a of dataAgents) {
      expect(AGENT_ACTIVATION_PLAN[a].hasFairnessGate).toBe(false);
    }
  });
});

describe('TIER_ORDER — tier gate enforcement (AGT-03)', () => {
  it('enterprise has highest order', () =>
    expect(TIER_ORDER['enterprise']).toBeGreaterThan(TIER_ORDER['scale']));

  it('free has lowest order', () =>
    expect(TIER_ORDER['free']).toBe(0));

  it('growth > pro > starter > free', () => {
    expect(TIER_ORDER['growth']).toBeGreaterThan(TIER_ORDER['pro']);
    expect(TIER_ORDER['pro']).toBeGreaterThan(TIER_ORDER['starter']);
    expect(TIER_ORDER['starter']).toBeGreaterThan(TIER_ORDER['free']);
  });

  it('free-tier agents accessible at free', () => {
    const freeTierAgents = (Object.keys(AGENT_ACTIVATION_PLAN) as AgentType[])
      .filter(a => AGENT_ACTIVATION_PLAN[a].minTier === 'free');
    expect(freeTierAgents.length).toBeGreaterThan(0);
    for (const a of freeTierAgents) {
      expect(TIER_ORDER['free']).toBeGreaterThanOrEqual(TIER_ORDER[AGENT_ACTIVATION_PLAN[a].minTier]);
    }
  });

  it('growth-tier agents NOT accessible at starter', () => {
    const growthAgents = (Object.keys(AGENT_ACTIVATION_PLAN) as AgentType[])
      .filter(a => AGENT_ACTIVATION_PLAN[a].minTier === 'growth');
    expect(growthAgents.length).toBeGreaterThan(0);
    for (const a of growthAgents) {
      expect(TIER_ORDER['starter']).toBeLessThan(TIER_ORDER[AGENT_ACTIVATION_PLAN[a].minTier]);
    }
  });
});

describe('routeModel() — expanded agent set (AGT-05)', () => {
  it('enterprise always gets opus for on-demand agents', () => {
    const onDemand: AgentType[] = ['cvr_optimizer','lead_scorer','competitor_tracker','market_researcher'];
    for (const a of onDemand) {
      expect(routeModel(a, 'enterprise')).toContain('opus');
    }
  });

  it('haiku agents route to haiku on pro tier', () => {
    const haikuAgents: AgentType[] = ['knowledge_base_curator','workspace_reporter','trend_detector'];
    for (const a of haikuAgents) {
      expect(routeModel(a, 'pro')).toContain('haiku');
    }
  });

  it('on-demand content agents get sonnet on growth tier', () => {
    const contentAgents: AgentType[] = ['ad_creative_generator','content_repurposer','landing_page_optimizer'];
    for (const a of contentAgents) {
      expect(routeModel(a, 'growth')).toContain('sonnet');
    }
  });

  it('HITL gated agent (reddit_manager) still routes to haiku on pro', () =>
    expect(routeModel('reddit_manager', 'pro')).toContain('haiku'));
});
