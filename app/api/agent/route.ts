// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Agent Dispatch Route
// POST /api/agent/dispatch
// TEVV Bias Fix: ContentFairnessFilter applied to content-generating agents
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../lib/auth/middleware';
import { applyFairnessFilter } from '../../../lib/ai/fairness';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentType } from '../../../lib/types/index';
import { MODELS, HAIKU_AGENTS, TIER_LIMITS, REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../lib/types/index';

export const runtime = 'nodejs';
const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

// Agents whose output must pass fairness filter (TEVV Bias fix)
const CONTENT_AGENTS = new Set<AgentType>([
  'geo_content_generator','ad_creative_generator','email_sequencer',
  'brand_voice_enforcer','content_repurposer','landing_page_optimizer',
]);

const routeModel = (agent: AgentType, tier: string): string => {
  if (tier === 'enterprise') return MODELS.opus;
  if (HAIKU_AGENTS.has(agent)) return MODELS.haiku;
  return MODELS.sonnet;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const authResult = await authenticate(req.headers.get('authorization'));
  if (!authResult.ok) {
    const [status, body] = authErrorToHttp(authResult.error);
    return NextResponse.json(body, { status });
  }
  const { tenant } = authResult.ctx;

  const body = await req.json() as { agentType?: string; input?: object };
  if (!body.agentType) {
    return NextResponse.json({ error: 'agentType required' }, { status: 400 });
  }

  const agentType = body.agentType as AgentType;

  // HITL: Reddit never auto-dispatches
  if (agentType === 'reddit_manager' && REDDIT_REQUIRES_HUMAN_APPROVAL) {
    return NextResponse.json({
      queued: false,
      requiresHumanApproval: true,
      message: 'Reddit actions require explicit human approval via /api/reddit/approve',
    });
  }

  // Tier gate
  const limits       = TIER_LIMITS[tenant.tier];
  const enabledCount = limits.agentsEnabled;
  // (simplified — production maps agentType to ordinal position)
  if (enabledCount !== -1 && enabledCount < 10 && CONTENT_AGENTS.has(agentType)) {
    return NextResponse.json({ error: `Agent requires Pro tier or above` }, { status: 403 });
  }

  const model  = routeModel(agentType, tenant.tier);
  const system = getAgentPrompt(agentType);
  const user   = `Tenant: ${tenant.name} (${tenant.tier}). Input: ${JSON.stringify(body.input ?? {})}. Return JSON only.`;

  const start = Date.now();
  try {
    const response = await anthropic.messages.create({
      model, system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 800,
    });

    const rawOutput = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    // TEVV Bias Fix: apply fairness filter to content-generating agents
    let output = rawOutput;
    let fairnessResult = null;
    if (CONTENT_AGENTS.has(agentType)) {
      fairnessResult = applyFairnessFilter(rawOutput);
      output = fairnessResult.sanitized;
    }

    return NextResponse.json({
      agentType,
      model,
      status: 'success',
      output,
      durationMs: Date.now() - start,
      fairness: fairnessResult ? {
        auditId: fairnessResult.auditId,
        score:   fairnessResult.score,
        passed:  fairnessResult.passed,
        flags:   fairnessResult.flags.length,
      } : null,
    });

  } catch (e) {
    return NextResponse.json({
      agentType, model, status: 'failed',
      error: String(e), durationMs: Date.now() - start,
    }, { status: 500 });
  }
}

const getAgentPrompt = (agent: AgentType): string => {
  const prompts: Partial<Record<AgentType, string>> = {
    geo_content_generator: 'Generate GEO-optimized content for AI search engines. Return JSON: {"title":"...","body":"...","geoScore":82,"citations":["..."]}',
    keyword_researcher:    'Find keyword opportunities in positions 4-20. Return JSON: {"opportunities":[{"keyword":"...","position":8,"impressions":420}]}',
    social_listener:       'Analyze brand sentiment across platforms. Return JSON: {"mentions":12,"sentiment":0.65,"crisis":false}',
    ad_creative_generator: 'Generate inclusive, accessible ad copy for broad audiences. Return JSON: {"headline":"...","body":"...","cta":"..."}',
    churn_predictor:       'Score churn risk 0-1. Return JSON: {"highRisk":[{"contactId":"...","risk":0.82}]}',
  };
  return prompts[agent] ?? 'Execute your marketing function. Return JSON summary.';
};
