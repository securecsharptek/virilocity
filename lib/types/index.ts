// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 Vercel Multicloud — Core Type System
// B2B (org/team) + B2C (individual) tenant model
// TEVV-Fixed: F-01 F-02 F-03 F-04 · Bias COND · Adversarial COND · WCAG FLAG
// CloudOneSoftware LLC · Dr. Kenneth Melie, PhD
// ─────────────────────────────────────────────────────────────────────────────

export const VERSION    = '16.4.0' as const;
export const CODENAME   = 'Apex-Omniscient-Vercel' as const;
export const PLATFORM   = 'vercel-multicloud' as const;
export const AGENT_COUNT = 39 as const;
export const DB_TABLES   = 17 as const; // +2: orgMembers, fairnessLogs

// ── TEVV Fix Registry ─────────────────────────────────────────────────────────
export const TEVV_FIXES = {
  'F-01': 'Dockerfile USER node instruction added',
  'F-02': 'Webhook replay window ±300s enforced (HubSpot + Stripe)',
  'F-03': 'In-memory fallback rate limiter for Redis-unavailable scenarios',
  'F-04': 'WCAG 2.2 compliant Next.js frontend with aria-* and semantic HTML',
  'BIAS': 'ContentFairnessFilter applied to all GEOContentGenerator outputs',
  'VISUAL': 'Adaptive Card schema validation in GraphTeams.sendChannelMessage()',
  'SBOM': 'npm sbom generation added to CI pipeline',
} as const;

// ── Tenant model — B2B (org) + B2C (individual) ───────────────────────────────
export type TenantModel = 'b2b' | 'b2c';
export type Tier  = 'free' | 'starter' | 'pro' | 'growth' | 'scale' | 'enterprise';
export type Cycle = 'monthly' | 'annual';
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Tenant {
  id:         string;
  name:       string;
  tier:       Tier;
  model:      TenantModel;    // 'b2b' = org seats, 'b2c' = individual
  status:     'active' | 'suspended' | 'trial';
  ownerId?:   string;         // B2C: individual user ID
  orgId?:     string;         // B2B: organization ID
  metadata?:  Record<string, unknown>;
  createdAt:  string;
}

export interface OrgMember {
  id:       string;
  orgId:    string;
  userId:   string;
  role:     OrgRole;
  joinedAt: string;
}

// ── Pricing — V14.3 mass-market low-barrier ────────────────────────────────────
export const PRICES: Record<Tier, Record<Cycle, number>> = {
  free:       { monthly: 0,   annual: 0   },
  starter:    { monthly: 79,  annual: 63  },
  pro:        { monthly: 399, annual: 319 },
  growth:     { monthly: 699, annual: 559 },
  scale:      { monthly: 999, annual: 799 },
  enterprise: { monthly: 0,   annual: 0   },
} as const;

export const GOMEGA_REF = { seo:699, ads:1399, bundle:2099, website:279, full:2378 } as const;
export const REDDIT_REQUIRES_HUMAN_APPROVAL = true as const;

// ── Tier limits ───────────────────────────────────────────────────────────────
export const TIER_LIMITS: Record<Tier, {
  agentsEnabled: number;
  seats: number;           // B2B: team seats (-1 = unlimited)
  kbStorageGb: number;
  geoEngines: number;
  samlSso: boolean;
  b2bOrg: boolean;         // Can create org (B2B mode)
  vercelEdge: boolean;
  advancedAnalytics: boolean;
}> = {
  free:       { agentsEnabled:3,  seats:1,   kbStorageGb:0,  geoEngines:1, samlSso:false, b2bOrg:false, vercelEdge:false, advancedAnalytics:false },
  starter:    { agentsEnabled:10, seats:1,   kbStorageGb:1,  geoEngines:2, samlSso:false, b2bOrg:false, vercelEdge:true,  advancedAnalytics:false },
  pro:        { agentsEnabled:20, seats:5,   kbStorageGb:10, geoEngines:4, samlSso:false, b2bOrg:true,  vercelEdge:true,  advancedAnalytics:false },
  growth:     { agentsEnabled:-1, seats:20,  kbStorageGb:50, geoEngines:7, samlSso:false, b2bOrg:true,  vercelEdge:true,  advancedAnalytics:true  },
  scale:      { agentsEnabled:-1, seats:100, kbStorageGb:200,geoEngines:7, samlSso:false, b2bOrg:true,  vercelEdge:true,  advancedAnalytics:true  },
  enterprise: { agentsEnabled:-1, seats:-1,  kbStorageGb:-1, geoEngines:7, samlSso:true,  b2bOrg:true,  vercelEdge:true,  advancedAnalytics:true  },
} as const;

// ── AI Models (WAF Cost) ───────────────────────────────────────────────────────
export const MODELS = {
  opus:   'claude-opus-4-6'          as const,
  sonnet: 'claude-sonnet-4-6'        as const,
  haiku:  'claude-haiku-4-5-20251001' as const,
} as const;

export const HAIKU_AGENTS: ReadonlySet<string> = new Set([
  'social_listener','ai_visibility_tracker','reddit_manager',
  'trend_detector','knowledge_base_curator','workspace_reporter',
]);

// ── Result type ───────────────────────────────────────────────────────────────
export type Ok<T>  = { ok: true;  value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T,E=string> = Ok<T> | Err<E>;
export const ok  = <T>(value: T): Ok<T>  => ({ ok: true,  value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

// ── Agent types ───────────────────────────────────────────────────────────────
export type AgentType =
  | 'keyword_researcher' | 'trend_detector' | 'hs_contact_enricher'
  | 'bid_optimizer' | 'backlink_outreach' | 'social_listener'
  | 'ai_visibility_tracker' | 'churn_predictor' | 'ab_test_orchestrator'
  | 'workspace_reporter' | 'cross_channel_orchestrator'
  | 'geo_content_generator' | 'cvr_optimizer' | 'lead_scorer'
  | 'revenue_forecaster' | 'viral_analyzer' | 'reddit_manager'
  | 'knowledge_base_curator' | 'email_sequencer' | 'ad_creative_generator'
  | 'seo_auditor' | 'competitor_tracker' | 'content_repurposer'
  | 'influencer_matcher' | 'pr_monitor' | 'brand_voice_enforcer'
  | 'customer_journey_mapper' | 'attribution_analyzer' | 'budget_allocator'
  | 'landing_page_optimizer' | 'webinar_orchestrator' | 'community_manager'
  | 'referral_program_manager' | 'upsell_engine' | 'renewal_manager'
  | 'feedback_analyzer' | 'competitive_intel' | 'market_researcher'
  | 'campaign_orchestrator';

// ── WCAG 2.2 Accessibility — TEVV Fix F-04 ────────────────────────────────────
export interface A11yMeta {
  lang:          string;  // e.g. 'en'
  ariaLabel?:    string;
  ariaDescribedBy?: string;
  role?:         string;
  tabIndex?:     number;
}

// ── Webhook replay protection — TEVV Fix F-02 ─────────────────────────────────
export const WEBHOOK_REPLAY_WINDOW_SECONDS = 300 as const; // ±5 minutes

// ── Agent activation plan — Theme D (AGT-01, AGT-03) ─────────────────────────
export type AgentActivationMode = 'autopilot' | 'on_demand';

export interface AgentActivation {
  mode:            AgentActivationMode;
  minTier:         Tier;    // minimum tier required to run
  hasFairnessGate: boolean; // output passes through ContentFairnessFilter
  hitlGated:       boolean; // requires human approval (never auto-dispatches)
}

// Tier ordering for gate enforcement
export const TIER_ORDER: Record<Tier, number> = {
  free: 0, starter: 1, pro: 2, growth: 3, scale: 4, enterprise: 5,
} as const;

export const AGENT_ACTIVATION_PLAN: Readonly<Record<AgentType, AgentActivation>> = {
  // ── 11 autopilot agents ──────────────────────────────────────────────────
  keyword_researcher:          { mode: 'autopilot',  minTier: 'free',       hasFairnessGate: false, hitlGated: false },
  trend_detector:              { mode: 'autopilot',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  hs_contact_enricher:         { mode: 'autopilot',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  bid_optimizer:               { mode: 'autopilot',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  backlink_outreach:           { mode: 'autopilot',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  social_listener:             { mode: 'autopilot',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  ai_visibility_tracker:       { mode: 'autopilot',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  churn_predictor:             { mode: 'autopilot',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  ab_test_orchestrator:        { mode: 'autopilot',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  workspace_reporter:          { mode: 'autopilot',  minTier: 'free',       hasFairnessGate: false, hitlGated: false },
  cross_channel_orchestrator:  { mode: 'autopilot',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  // ── 28 on-demand agents ──────────────────────────────────────────────────
  geo_content_generator:       { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: true,  hitlGated: false },
  cvr_optimizer:               { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  lead_scorer:                 { mode: 'on_demand',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  revenue_forecaster:          { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  viral_analyzer:              { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  reddit_manager:              { mode: 'on_demand',  minTier: 'starter',    hasFairnessGate: false, hitlGated: true  },
  knowledge_base_curator:      { mode: 'on_demand',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  email_sequencer:             { mode: 'on_demand',  minTier: 'starter',    hasFairnessGate: true,  hitlGated: false },
  ad_creative_generator:       { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: true,  hitlGated: false },
  seo_auditor:                 { mode: 'on_demand',  minTier: 'free',       hasFairnessGate: false, hitlGated: false },
  competitor_tracker:          { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  content_repurposer:          { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: true,  hitlGated: false },
  influencer_matcher:          { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  pr_monitor:                  { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  brand_voice_enforcer:        { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: true,  hitlGated: false },
  customer_journey_mapper:     { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  attribution_analyzer:        { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  budget_allocator:            { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  landing_page_optimizer:      { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: true,  hitlGated: false },
  webinar_orchestrator:        { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  community_manager:           { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  referral_program_manager:    { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  upsell_engine:               { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  renewal_manager:             { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
  feedback_analyzer:           { mode: 'on_demand',  minTier: 'starter',    hasFairnessGate: false, hitlGated: false },
  competitive_intel:           { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  market_researcher:           { mode: 'on_demand',  minTier: 'pro',        hasFairnessGate: false, hitlGated: false },
  campaign_orchestrator:       { mode: 'on_demand',  minTier: 'growth',     hasFairnessGate: false, hitlGated: false },
} as const;
