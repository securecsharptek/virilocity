// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.5 — Agent Activation Matrix
// GET /api/agent/matrix
// AGT-03: Orchestration mapping for all 39 agents
// AGT-04: KPI and status telemetry per agent
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import {
  AGENT_ACTIVATION_PLAN,
  TIER_ORDER,
} from '../../../../lib/types/index';
import type { AgentType, Tier } from '../../../../lib/types/index';

export const runtime = 'nodejs';

// Agents eligible for this tenant given their tier
const eligibleForTier = (agentTier: Tier, tenantTier: Tier): boolean =>
  TIER_ORDER[tenantTier] >= TIER_ORDER[agentTier];

const AUTOPILOT_SET = new Set<AgentType>(
  (Object.entries(AGENT_ACTIVATION_PLAN) as [AgentType, typeof AGENT_ACTIVATION_PLAN[AgentType]][])
    .filter(([, plan]) => plan.mode === 'autopilot')
    .map(([agentType]) => agentType),
);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(req.headers.get('authorization'));
  if (!authResult.ok) {
    const [status, body] = authErrorToHttp(authResult.error);
    return NextResponse.json(body, { status });
  }
  const { tenant } = authResult.ctx;

  const matrix = (Object.entries(AGENT_ACTIVATION_PLAN) as [AgentType, typeof AGENT_ACTIVATION_PLAN[AgentType]][]).map(
    ([agentType, plan]) => ({
      agentType,
      mode:            plan.mode,
      minTier:         plan.minTier,
      hasFairnessGate: plan.hasFairnessGate,
      hitlGated:       plan.hitlGated,
      inAutopilot:     AUTOPILOT_SET.has(agentType),
      // Tenant-scoped eligibility
      eligibleForTenant: !plan.hitlGated && eligibleForTier(plan.minTier, tenant.tier),
    }),
  );

  const autopilotCount  = matrix.filter(a => a.inAutopilot).length;
  const onDemandCount   = matrix.filter(a => !a.inAutopilot).length;
  const eligibleCount   = matrix.filter(a => a.eligibleForTenant).length;
  const fairnessGated   = matrix.filter(a => a.hasFairnessGate).length;
  const hitlGated       = matrix.filter(a => a.hitlGated).length;

  return NextResponse.json({
    tenantId:      tenant.id,
    tenantTier:    tenant.tier,
    totalAgents:   matrix.length,
    autopilotCount,
    onDemandCount,
    eligibleCount,
    fairnessGated,
    hitlGated,
    agents: matrix,
  });
}
