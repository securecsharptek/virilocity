// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Autopilot Engine
// 11 daily tasks · B2B/B2C aware · Fairness pipeline for content agents
// HITL: Reddit always blocked from autopilot — requiresHumanApproval hardcoded
// ─────────────────────────────────────────────────────────────────────────────
import { runAgentCall } from '../ai/client';
import { uid, now, trunc, withinLimit } from '../utils/index';
import { TIER_LIMITS, REDDIT_REQUIRES_HUMAN_APPROVAL, AGENT_COUNT } from '../types/index';
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

export interface RunAutopilotOptions {
  shouldStop?: () => boolean;
}

// ── 11 daily autopilot tasks (Reddit excluded — HITL gate) ───────────────────
const AUTOPILOT_TASKS: AgentType[] = [
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
    'Scan GSC data for keywords in positions 4-20 with >100 impressions. Return JSON only: {"opportunities":[{"keyword":"...","position":8,"impressions":420,"contentBrief":"..."}]}',
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
    'Process pending backlink follow-ups. Return JSON only: {"processed":5,"drafted":3,"sent":2,"domainAuthority":42}',
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
      outputSummary: trunc(output, 200),
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
  const limits   = TIER_LIMITS[tenant.tier];
  const results: AgentExecution[] = [];

  // Determine which tasks this tier can run
  const enabledCount = limits.agentsEnabled;
  const tasks = AUTOPILOT_TASKS.filter((_, idx) =>
    withinLimit(idx, enabledCount),
  );

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

    const exec = await runAgent(agent, tenant, {});
    results.push(exec);

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
