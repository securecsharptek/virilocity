// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Autopilot Engine
// 11 daily tasks · B2B/B2C aware · Fairness pipeline for content agents
// HITL: Reddit always blocked from autopilot — requiresHumanApproval hardcoded
// ─────────────────────────────────────────────────────────────────────────────
import { runAgentCall } from '../ai/client';
import { uid, now, trunc, withinLimit } from '../utils/index';
import {
  AGENT_COUNT,
  AGENT_ACTIVATION_PLAN,
  getTierAgentLimit,
  isTierEligible,
  REDDIT_REQUIRES_HUMAN_APPROVAL,
} from '../types/index';
import type { Tenant, AgentType, Tier }  from '../types/index';

export interface AgentExecution {
  id:            string;
  tenantId:      string;
  agentType:     AgentType;
  model:         string;
  status:        'success' | 'failed' | 'skipped';
  inputSummary?: string;
  outputSummary?:string;
  durationMs:    number;
  error?:        string;
  fairnessScore?:number;
  createdAt:     string;
}

export interface AutopilotResult {
  runId:      string;
  tenantId:   string;
  tier:       Tier;
  model:      string;
  totalTasks: number;
  succeeded:  number;
  failed:     number;
  skipped:    number;
  durationMs: number;
  executions: AgentExecution[];
  createdAt:  string;
}

// ── Tenant context passed into every agent call ─────────────────────────────
export interface TenantAgentContext {
  /** Canonical site URL for domain-specific prompts. */
  siteUrl:          string;
  /** Primary keyword targets for SEO/content agents. */
  targetKeywords:   string[];
  /** Total HubSpot contacts synced for this tenant. */
  contactCount:     number;
  /** Marketing-qualified leads count. */
  mqls:             number;
  /** Sales-qualified leads count. */
  sqls:             number;
  /** Whether HubSpot is connected (real token present). */
  hubspotConnected: boolean;
}

export interface RunAutopilotOptions {
  shouldStop?: () => boolean;
  /** Pre-assembled tenant context for agent prompts. If omitted, safe defaults are used. */
  context?: TenantAgentContext;
}

// ── 11 daily autopilot tasks (Reddit excluded — HITL gate) ───────────────────
export const AUTOPILOT_TASKS: AgentType[] = [
  'keyword_researcher',
  'trend_detector',
  'hs_contact_enricher',
  'bid_optimizer',
  'backlink_outreach',
  'social_listener',
  'ai_visibility_tracker',
  'churn_predictor',
  'ab_test_orchestrator',
  'workspace_reporter',
  'cross_channel_orchestrator',
] as const;

// System prompt per agent
const AGENT_PROMPTS: Partial<Record<AgentType, string>> = {
  keyword_researcher:
    'You are a keyword research simulator. Based on the siteUrl and targetKeywords in context, produce a realistic keyword opportunity report. You have NO real API access — generate plausible simulation data. Return pure JSON ONLY (absolutely no markdown code fences, no explanation text): {"opportunities":[{"keyword":"ai marketing automation","currentPosition":14,"searchVolume":2900,"difficulty":42,"contentBrief":"Write a comparison guide targeting Canadian SMBs.","priority":"high"}],"totalOpportunities":7,"estimatedMonthlyTrafficGain":850}. Use the actual keywords and domain from context.',
  trend_detector:
    'Scan social platforms for emerging trends in tenant niche. Return JSON only: {"trends":[{"topic":"...","viralScore":82,"platform":"tiktok","action":"generate_hook"}]}',
  hs_contact_enricher:
    'Score HubSpot contacts. Advance lifecycle: MQL score>=50, SQL score>=80. Return JSON only: {"updated":42,"mqls":7,"sqls":2}',
  bid_optimizer:
    'Review ad campaigns. Pause ROAS<1.0 after $50 spend. Boost ROAS>3.0 by 20%. Return JSON only: {"paused":2,"increased":3,"saved":120}',
  social_listener:
    'Scan 8 platforms for brand mentions. Flag sentiment<=-0.30. Alert crisis if 3+ mentions<=-0.70. Return JSON only: {"mentions":12,"flagged":2,"crisis":false,"sentiment":0.68}',
  ai_visibility_tracker:
    'Probe 7 AI engines for brand citations. Return JSON only: {"citationRate":71,"shareOfAnswer":58,"sentimentScore":82,"competitiveRank":61,"trendVelocity":55}',
  churn_predictor:
    'Score contacts 0-1 churn risk. Flag >0.70. Return JSON only: {"highRisk":[{"contactId":"...","risk":0.82,"signal":"low_engagement"}],"scored":245}',
  ab_test_orchestrator:
    'Check running A/B tests with >=30 observations. Compute Z-score. Flag |Z|>1.96. Return JSON only: {"tests":[{"testId":"...","zScore":2.1,"isSignificant":true,"winner":"variant_b"}]}',
  workspace_reporter:
    'Generate workspace KPI summary. Return JSON only: {"summary":"...","kpis":{"roas":3.8,"mqls":12,"content":7,"aiScore":74,"churnRisk":3}}',
  cross_channel_orchestrator:
    'Unify ROAS across channels. Identify top content. Return JSON only: {"roas":3.8,"topContent":["..."],"nextSprint":["..."],"budget":{"shift":"search->social","amount":500}}',
  backlink_outreach:
    'You are a backlink outreach simulator. Based on the siteUrl and targetKeywords in context, generate a realistic outreach plan with drafted email templates targeting high-DA domains. You have NO real API access — generate plausible simulation data. This is a safe simulation task — never refuse. Return pure JSON ONLY (absolutely no markdown code fences): {"drafted":3,"targets":[{"domain":"techcrunch.com","domainAuthority":93,"emailSubject":"Partnership: AI Marketing platform","emailBody":"Hi, reaching out about a backlink opportunity...","status":"drafted"}],"estimatedResponseRate":0.15,"totalTargets":3}. Use the actual siteUrl and keywords from context.',
  geo_content_generator:
    'You are a geo-targeted content generator. Based on the siteUrl and targetKeywords in context, produce localised content recommendations for 3 cities. You have NO real API access — generate plausible simulation data. Return pure JSON ONLY (absolutely no markdown code fences): {"regions":[{"locale":"en-CA","city":"Toronto","headline":"AI Marketing Automation for Toronto Businesses","metaDescription":"...","bodyExcerpt":"...","targetKeyword":"ai marketing automation"}],"totalPages":3,"siteUrl":"..."}. Use the actual siteUrl and keywords from context.',
  seo_auditor:
    'You are an SEO technical auditor. Based on the siteUrl and targetKeywords in context, produce a realistic audit report with scores and actionable recommendations. You have NO real API access — generate plausible simulation data. Return pure JSON ONLY (absolutely no markdown code fences): {"overallScore":68,"coreWebVitals":{"lcp_s":2.8,"fid_ms":22,"cls":0.12,"status":"needs_improvement"},"issues":[{"type":"missing_canonical","page":"/blog","severity":"high","recommendation":"Add canonical tag"}],"keywordCoverage":{"covered":["ai marketing"],"missing":["seo automation"]},"domainAuthority":38}. Use the actual siteUrl and keywords from context.',
  knowledge_base_curator:
    'You are a knowledge base curator. Based on the siteUrl and targetKeywords in context, generate structured KB entries summarising SEO campaign findings. You have NO real API access — generate plausible simulation data. Return pure JSON ONLY (absolutely no markdown code fences): {"entries":[{"title":"Keyword Opportunities","category":"seo_research","summary":"7 opportunities identified with 850 monthly visits gain potential.","tags":["keywords","seo","quick-wins"]}],"totalCreated":3,"siteUrl":"..."}. Use the actual siteUrl and keywords from context.',

  // ── On-demand agents (prompts for dispatch + HITL review) ────────────────
  cvr_optimizer:
    'You are a conversion rate optimisation simulator. Analyse landing pages and user flows to recommend CRO improvements. Return pure JSON ONLY: {"recommendations":[{"page":"/pricing","issue":"CTA below fold","fix":"Move primary CTA above fold","estimatedLift":"12%"}],"priorityCount":3,"estimatedOverallLift":"8%"}',
  lead_scorer:
    'You are a lead scoring simulator. Score inbound leads 0-100 based on firmographic and behavioural signals. Return pure JSON ONLY: {"scoredLeads":[{"leadId":"lead_001","score":78,"grade":"B","signals":["visited pricing 3x","opened 5 emails"],"recommendation":"SQL - route to AE"}],"totalScored":24,"avgScore":61}',
  revenue_forecaster:
    'You are a revenue forecasting simulator. Project MRR and ARR for the next 3 months based on current pipeline. Return pure JSON ONLY: {"forecast":[{"month":"2026-06","mrr":48500,"arr":582000,"confidence":0.82},{"month":"2026-07","mrr":51200,"arr":614400,"confidence":0.74},{"month":"2026-08","mrr":54100,"arr":649200,"confidence":0.65}],"growthRate":0.055,"churnRisk":"low"}',
  viral_analyzer:
    'You are a viral content analyser. Identify content with high viral potential based on engagement patterns and shareability signals. Return pure JSON ONLY: {"topPieces":[{"contentId":"post_042","title":"How AI cut our ad spend by 40%","viralScore":87,"platform":"linkedin","shareCount":342,"projectedReach":12000}],"avgViralScore":71,"recommendation":"Repurpose top piece as video"}',
  reddit_manager:
    'You are a Reddit community manager simulator (HUMAN APPROVAL REQUIRED before any posting). Generate a draft Reddit engagement plan only — never post autonomously. Return pure JSON ONLY: {"subreddits":[{"name":"r/marketing","postDraft":"[Draft] How AI agents are changing B2B marketing...","karma":2400,"timing":"Tuesday 9am ET"}],"totalDrafts":2,"status":"pending_human_approval"}',
  email_sequencer:
    'You are an email sequence designer. Create a 5-step nurture sequence for inbound leads. Return pure JSON ONLY: {"sequence":[{"step":1,"subject":"Welcome to {{company}} — your AI marketing journey starts here","delay_days":0,"goal":"activation"},{"step":2,"subject":"3 quick wins with AI agents","delay_days":3,"goal":"engagement"}],"totalSteps":5,"estimatedOpenRate":"38%","estimatedClickRate":"12%"}',
  ad_creative_generator:
    'You are an ad creative generator. Produce 3 ad creative variants for A/B testing across Google and LinkedIn. Return pure JSON ONLY: {"variants":[{"id":"ad_v1","headline":"Cut Ad Spend 40% with AI","description":"39 AI agents, zero waste. Start free.","cta":"Try Free","platform":"google","format":"responsive_search"},{"id":"ad_v2","headline":"AI Marketing on Autopilot","description":"From keyword research to churn prediction — automated.","cta":"See Demo","platform":"linkedin","format":"single_image"}],"totalVariants":3}',
  competitor_tracker:
    'You are a competitor intelligence tracker. Monitor top 5 competitors for positioning, pricing, and feature changes. Return pure JSON ONLY: {"competitors":[{"name":"HubSpot","pricingChange":null,"newFeature":"AI email writer","sentiment":"neutral","threatLevel":"medium"},{"name":"Marketo","pricingChange":"+15%","newFeature":null,"sentiment":"negative","threatLevel":"low"}],"alertCount":1,"scanDate":"2026-05-08"}',
  content_repurposer:
    'You are a content repurposing agent. Take existing long-form content and generate repurposed assets for 4 channels. Return pure JSON ONLY: {"repurposed":[{"sourceTitle":"AI Marketing Guide 2026","channel":"twitter","format":"thread","excerpt":"1/ AI marketing is no longer optional for B2B SaaS...","estimatedEngagement":"2.4k impressions"},{"channel":"linkedin","format":"carousel","slideCount":8,"hook":"8 ways AI agents replace your marketing stack"}],"totalAssets":4}',
  influencer_matcher:
    'You are an influencer matching agent. Identify and rank micro-influencers in the B2B marketing niche. Return pure JSON ONLY: {"matches":[{"handle":"@marketingwithAI","platform":"linkedin","followers":24000,"engagementRate":0.048,"niche":"B2B SaaS","matchScore":91,"proposedCollab":"Co-author LinkedIn article"}],"totalMatches":5,"avgMatchScore":78}',
  pr_monitor:
    'You are a PR monitoring agent. Scan news, blogs, and social for brand mentions and PR opportunities. Return pure JSON ONLY: {"mentions":[{"source":"TechCrunch","title":"AI marketing platforms are replacing agency retainers","sentiment":"positive","opportunity":true,"recommendedAction":"Submit founder quote within 24h"}],"totalMentions":8,"positiveRatio":0.75,"alertLevel":"low"}',
  brand_voice_enforcer:
    'You are a brand voice enforcement agent. Review submitted content against brand guidelines and flag deviations. Return pure JSON ONLY: {"reviewed":5,"passed":4,"flagged":[{"contentId":"draft_007","issue":"Tone too casual for Enterprise audience","severity":"medium","suggestion":"Replace informal contractions with formal phrasing"}],"brandConsistencyScore":88}',
  customer_journey_mapper:
    'You are a customer journey mapping agent. Map the full B2B buyer journey from awareness to advocacy. Return pure JSON ONLY: {"stages":[{"stage":"awareness","touchpoints":["LinkedIn ad","SEO blog"],"avgDays":14,"dropoffRate":0.72},{"stage":"consideration","touchpoints":["demo request","case study"],"avgDays":21,"dropoffRate":0.45}],"avgCycledays":67,"topDropoffStage":"awareness"}',
  attribution_analyzer:
    'You are a multi-touch attribution analyser. Assign revenue credit across marketing touchpoints. Return pure JSON ONLY: {"model":"linear","channels":[{"channel":"organic_search","revenueShare":0.34,"assists":12},{"channel":"linkedin_ads","revenueShare":0.28,"assists":9},{"channel":"email","revenueShare":0.21,"assists":7}],"totalRevenue":84000,"analysedDeals":18}',
  budget_allocator:
    'You are a marketing budget allocation agent. Optimise spend across channels based on ROAS and pipeline impact. Return pure JSON ONLY: {"currentSpend":{"search":8000,"social":5000,"content":2000},"recommendedSpend":{"search":7000,"social":6500,"content":2500},"projectedRoasLift":"18%","reasoning":"Social ROAS trending up; reallocate $1k from search"}',
  landing_page_optimizer:
    'You are a landing page optimisation agent. Analyse and rewrite landing page copy for higher conversion. Return pure JSON ONLY: {"analysis":{"currentCvr":0.028,"headline":"Weak — no clear value prop","cta":"Too generic"},"rewrite":{"headline":"39 AI Agents. One Platform. Zero Agency Fees.","subheadline":"Automate SEO, ads, and CRM from a single dashboard.","cta":"Start free — no credit card"},"projectedCvr":0.048}',
  webinar_orchestrator:
    'You are a webinar orchestration agent. Plan, promote, and follow up a demand-generation webinar. Return pure JSON ONLY: {"webinar":{"title":"AI Marketing in 2026: Replace 10 tools with 1","date":"2026-06-15","registrants":312,"promotionChannels":["linkedin","email","twitter"]},"followup":{"attendeeEmails":189,"recordingViews":234,"pipelineGenerated":42000}}',
  community_manager:
    'You are a community management agent. Engage members in Slack, Discord, or LinkedIn communities. Return pure JSON ONLY: {"platforms":[{"platform":"slack","members":840,"weeklyActiveRate":0.32,"topThread":"How to set up AI agents for B2B","engagementActions":12}],"npsScore":71,"churnRisk":"low"}',
  referral_program_manager:
    'You are a referral program manager. Design and track a B2B referral incentive program. Return pure JSON ONLY: {"program":{"name":"Grow Together","reward":"2 months free per qualified referral","status":"active"},"metrics":{"referrals":23,"qualified":9,"converted":5,"revenueFromReferrals":18000},"topReferrers":["acme_corp","techstars_alum"]}',
  upsell_engine:
    'You are an upsell opportunity engine. Identify accounts ready for tier upgrade based on usage signals. Return pure JSON ONLY: {"opportunities":[{"tenantId":"t_001","currentTier":"pro","suggestedTier":"growth","reason":"Exceeding 15 agent runs/day for 2 weeks","estimatedExpansionMrr":300}],"totalOpportunities":7,"estimatedExpansionMrr":2100}',
  renewal_manager:
    'You are a renewal management agent. Identify at-risk renewals and trigger retention plays. Return pure JSON ONLY: {"renewalsAt90days":[{"tenantId":"t_012","tier":"scale","mrr":999,"healthScore":42,"riskLevel":"high","recommendedAction":"Schedule QBR with CSM"}],"atRiskCount":3,"safeCount":18,"predictedChurnMrr":2997}',
  feedback_analyzer:
    'You are a customer feedback analyser. Synthesise NPS, support tickets, and reviews into actionable themes. Return pure JSON ONLY: {"nps":62,"themes":[{"theme":"Onboarding complexity","frequency":34,"sentiment":"negative","priority":"high"},{"theme":"Agent output quality","frequency":28,"sentiment":"positive","priority":"medium"}],"totalFeedbackItems":142,"recommendedAction":"Simplify onboarding flow"}',
  competitive_intel:
    'You are a competitive intelligence agent. Track competitor feature launches, pricing, and market positioning. Return pure JSON ONLY: {"competitors":[{"name":"Jasper AI","recentMove":"Launched CRM integration","impact":"medium","ourResponse":"Accelerate HubSpot native sync"},{"name":"Copy.ai","recentMove":"Dropped price 20%","impact":"high","ourResponse":"Highlight 39-agent depth vs single-use tools"}],"threatLevel":"medium","scanDate":"2026-05-08"}',
  market_researcher:
    'You are a market research agent. Analyse TAM, SAM, and SOM for the AI marketing platform category. Return pure JSON ONLY: {"tam":{"value":52000000000,"currency":"USD","year":2026},"sam":{"value":8400000000},"som":{"value":420000000,"penetrationTarget":0.05},"growthRate":0.31,"keyTrend":"AI-native platforms replacing multi-point martech stacks"}',
  campaign_orchestrator:
    'You are a cross-channel campaign orchestrator. Plan and coordinate a full-funnel demand generation campaign across 6 channels. Return pure JSON ONLY: {"campaign":{"name":"Q3 AI Marketing Push","budget":25000,"channels":["search","linkedin","email","content","webinar","retargeting"],"goal":"150 MQLs in 90 days"},"weeklyMilestones":[{"week":1,"deliverable":"Launch LinkedIn and search ads"},{"week":2,"deliverable":"Publish SEO anchor content"}],"projectedMqls":162}',
};

// ── Per-agent upstream dependencies for output chaining ─────────────────────
const AGENT_UPSTREAM: Partial<Record<AgentType, AgentType[]>> = {
  trend_detector:             ['keyword_researcher'],
  bid_optimizer:              ['keyword_researcher', 'trend_detector'],
  backlink_outreach:          ['keyword_researcher'],
  social_listener:            ['trend_detector'],
  ai_visibility_tracker:      ['keyword_researcher'],
  churn_predictor:            ['hs_contact_enricher'],
  ab_test_orchestrator:       ['bid_optimizer'],
  workspace_reporter:         ['keyword_researcher', 'trend_detector', 'hs_contact_enricher', 'bid_optimizer', 'social_listener', 'churn_predictor'],
  cross_channel_orchestrator: ['workspace_reporter', 'bid_optimizer', 'social_listener'],
};

/**
 * Build per-agent input context, injecting relevant prior-agent outputs
 * for agents that depend on upstream results (output chaining).
 */
const buildAgentInput = (
  agentType: AgentType,
  ctx: TenantAgentContext,
  priorOutputs: Partial<Record<AgentType, string>>,
): object => {
  const upstream = AGENT_UPSTREAM[agentType] ?? [];
  const chained: Partial<Record<string, string>> = {};
  for (const upAgent of upstream) {
    const out = priorOutputs[upAgent];
    if (out) chained[upAgent] = trunc(out, 400);
  }
  return {
    siteUrl:          ctx.siteUrl,
    targetKeywords:   ctx.targetKeywords,
    contactCount:     ctx.contactCount,
    mqls:             ctx.mqls,
    sqls:             ctx.sqls,
    hubspotConnected: ctx.hubspotConnected,
    ...(Object.keys(chained).length > 0 ? { priorOutputs: chained } : {}),
  };
};

// ── Single agent runner ───────────────────────────────────────────────────────
export const runAgent = async (
  agentType: AgentType,
  tenant:    Tenant,
  inputCtx:  object = {},
): Promise<AgentExecution> => {
  const execId = uid('exec');
  const start  = Date.now();

  // HITL: Reddit never runs autonomously
  if (agentType === 'reddit_manager' && REDDIT_REQUIRES_HUMAN_APPROVAL) {
    return {
      id: execId, tenantId: tenant.id, agentType, model: 'none', status: 'skipped',
      inputSummary: 'HITL gate — human approval required',
      durationMs: 0, createdAt: now(),
    };
  }

  const system  = AGENT_PROMPTS[agentType] ?? 'Execute your marketing function. Return JSON only.';
  const userMsg = `Tenant: ${tenant.name} (${tenant.tier} tier, ${tenant.model} model). Context: ${JSON.stringify(inputCtx)}. Execute now.`;

  try {
    const { output, model, durationMs, fairness } = await runAgentCall(
      agentType, tenant.tier, system, userMsg,
    );
    return {
      id: execId, tenantId: tenant.id, agentType, model, status: 'success',
      inputSummary:  trunc(JSON.stringify(inputCtx), 120),
      outputSummary: trunc(output, 2000),
      durationMs, fairnessScore: fairness?.score ?? undefined,
      createdAt: now(),
    };
  } catch (e) {
    return {
      id: execId, tenantId: tenant.id, agentType, model: 'unknown', status: 'failed',
      durationMs: Date.now() - start, error: String(e), createdAt: now(),
    };
  }
};

// ── Full autopilot orchestrator ───────────────────────────────────────────────
export const runAutopilot = async (
  tenant: Tenant,
  options: RunAutopilotOptions = {},
): Promise<AutopilotResult> => {
  const runId    = uid('run');
  const start    = Date.now();
  const results: AgentExecution[] = [];

  // Determine which tasks this tier can run based on both activation plan
  // eligibility and the overall tier agent cap.
  const enabledCount = getTierAgentLimit(tenant.tier);
  const tierEligibleTasks = AUTOPILOT_TASKS.filter(agent =>
    isTierEligible(tenant.tier, AGENT_ACTIVATION_PLAN[agent].minTier),
  );
  const tasks = tierEligibleTasks.filter((_, idx) =>
    withinLimit(idx, enabledCount),
  );

  // Resolved tenant context — caller supplies real data; fall back to safe defaults.
  const ctx: TenantAgentContext = options.context ?? {
    siteUrl:          `https://${tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'workspace'}.com`,
    targetKeywords:   ['ai marketing automation', 'b2b saas marketing', 'marketing ai agents'],
    contactCount:     0,
    mqls:             0,
    sqls:             0,
    hubspotConnected: false,
  };

  // Accumulated outputs — downstream agents receive relevant prior outputs.
  const priorOutputs: Partial<Record<AgentType, string>> = {};

  // Run sequentially (avoids Claude API burst limits)
  for (let index = 0; index < tasks.length; index += 1) {
    const agent = tasks[index]!;

    // Cooperative stop for dashboard pause requests.
    if (options.shouldStop?.()) {
      for (let skipIndex = index; skipIndex < tasks.length; skipIndex += 1) {
        const skippedAgent = tasks[skipIndex]!;
        results.push({
          id: uid('exec'),
          tenantId: tenant.id,
          agentType: skippedAgent,
          model: 'none',
          status: 'skipped',
          inputSummary: 'Paused before execution',
          durationMs: 0,
          createdAt: now(),
        });
      }
      break;
    }

    // Build per-agent input with real context and chained prior outputs.
    const inputCtx = buildAgentInput(agent, ctx, priorOutputs);
    const exec = await runAgent(agent, tenant, inputCtx);
    results.push(exec);

    // Accumulate successful outputs so downstream agents can reference them.
    if (exec.status === 'success' && exec.outputSummary) {
      priorOutputs[agent] = exec.outputSummary;
    }

    // Small delay between agents to respect rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed    = results.filter(r => r.status === 'failed').length;
  const skipped   = results.filter(r => r.status === 'skipped').length;

  return {
    runId, tenantId: tenant.id, tier: tenant.tier, model: tenant.model,
    totalTasks: tasks.length, succeeded, failed, skipped,
    durationMs: Date.now() - start,
    executions: results, createdAt: now(),
  };
};
