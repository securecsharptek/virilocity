import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runAgent } from '../../../../lib/agents/autopilot';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import {
  A2AIdempotencyConflictError,
  appendA2AMessage,
  createA2ASession,
  setA2ASessionStatus,
  updateA2AStep,
} from '../../../../lib/a2a/session-store';
import { now, trunc, uid } from '../../../../lib/utils/index';
import { db, kbDocuments, tenants } from '../../../../lib/db/client';
import type { AgentType, Tenant } from '../../../../lib/types/index';

export const runtime = 'nodejs';

const DEEP_SEO_CHAIN: AgentType[] = [
  'keyword_researcher',
  'geo_content_generator',
  'seo_auditor',
  'backlink_outreach',
  'knowledge_base_curator',
] as const;

type CampaignPayload = {
  siteUrl?: string;
  targetKeywords?: string[];
};

type CampaignAuthResult = {
  tenant: Tenant;
};

const parseIdempotencyKey = (req: NextRequest): string | undefined => {
  const raw = req.headers.get('x-idempotency-key')?.trim();
  if (!raw) return undefined;
  return raw.slice(0, 120);
};

const buildCampaignFingerprint = (siteUrl: string, targetKeywords: string[]): string => {
  return JSON.stringify({
    campaignType: 'deep_seo',
    siteUrl,
    targetKeywords,
  });
};

const validatePayload = (payload: CampaignPayload): string | null => {
  if (!payload.siteUrl) return 'siteUrl is required';

  let parsed: URL;
  try {
    parsed = new URL(payload.siteUrl);
  } catch {
    return 'siteUrl must be a valid URL';
  }

  if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
    return 'siteUrl must use http or https';
  }

  if (!Array.isArray(payload.targetKeywords) || payload.targetKeywords.length === 0) {
    return 'targetKeywords must be a non-empty array';
  }

  const normalized = payload.targetKeywords
    .map(keyword => keyword.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return 'targetKeywords must include at least one non-empty keyword';
  }

  if (normalized.length > 25) {
    return 'targetKeywords cannot exceed 25 items';
  }

  return null;
};

const resolveAuth = async (req: NextRequest): Promise<{ ok: true; ctx: CampaignAuthResult } | { ok: false; response: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  const hasBearerToken = typeof authHeader === 'string' && /^Bearer\s+\S+$/i.test(authHeader.trim());

  if (hasBearerToken) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [status, body] = authErrorToHttp(bearerAuth.error);
      return { ok: false, response: NextResponse.json(body, { status }) };
    }

    return { ok: true, ctx: { tenant: bearerAuth.ctx.tenant } };
  }

  try {
    const session = await auth() as {
      tenantId?: string;
      tier?: Tenant['tier'];
      model?: Tenant['model'];
      user?: { email?: string | null };
    } | null;

    const tenantId = session?.tenantId ?? (session?.user?.email ? `tenant_${session.user.email}` : '');
    if (!tenantId) {
      return { ok: false, response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
    }

    const tenant: Tenant = {
      id: tenantId,
      name: session?.user?.email ?? 'Tenant',
      tier: session?.tier ?? 'pro',
      model: session?.model ?? 'b2b',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    return { ok: true, ctx: { tenant } };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
  }
};

const executeDeepSeoCampaign = async (
  sessionId: string,
  tenant: { id: string; name: string; tier: AgentType | string; model: string },
  siteUrl: string,
  targetKeywords: string[],
): Promise<void> => {
  await appendA2AMessage(sessionId, {
    role: 'orchestrator',
    content: `Deep SEO campaign started for ${siteUrl} with ${targetKeywords.length} keywords`,
  });

  for (let i = 0; i < DEEP_SEO_CHAIN.length; i += 1) {
    const agent = DEEP_SEO_CHAIN[i]!;
    const stepId = `step_${i + 1}`;

    await updateA2AStep(sessionId, stepId, { status: 'running', startedAt: now() });
    await appendA2AMessage(sessionId, {
      role: 'agent',
      agent,
      content: `${agent} started`,
    });

    try {
      const result = await runAgent(agent, tenant as Parameters<typeof runAgent>[1], {
        siteUrl,
        targetKeywords,
      });

      const success = result.status === 'success';
      await updateA2AStep(sessionId, stepId, {
        status: success ? 'success' : 'failed',
        finishedAt: now(),
        outputSummary: result.outputSummary,
        error: result.error,
      });

      // Auto-persist knowledge_base_curator entries into the KB table
      if (success && agent === 'knowledge_base_curator' && result.outputSummary) {
        try {
          let raw = result.outputSummary.trim().replace(/^```(?:json|JSON)?\.\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
          const curatorOutput = JSON.parse(raw) as { entries?: Array<{ title?: string; category?: string; summary?: string; tags?: string[] }> };
          const entries = Array.isArray(curatorOutput.entries) ? curatorOutput.entries : [];
          if (entries.length > 0) {
            // Ensure the tenant row exists before FK-constrained inserts
            await db.insert(tenants).values({
              id: tenant.id,
              name: tenant.name,
              tier: tenant.tier as string,
              model: tenant.model,
              status: 'active',
            }).onConflictDoNothing();
            for (const entry of entries) {
              if (!entry.title || !entry.summary) continue;
              const content = [
                entry.summary,
                entry.tags?.length ? `Tags: ${entry.tags.join(', ')}` : '',
                `Source: ${siteUrl}`,
                `Campaign keywords: ${targetKeywords.join(', ')}`,
              ].filter(Boolean).join('\n\n');
              await db.insert(kbDocuments).values({
                id: uid('doc'),
                tenantId: tenant.id,
                name: entry.title.slice(0, 255),
                content,
                category: (['brand','product','competitor','market','legal','other'].includes(entry.category ?? '') ? entry.category : 'other') as string,
                vectorId: `vec_${uid('kb')}`,
              }).onConflictDoNothing();
            }
          }
        } catch (kbErr) {
          console.error('[campaign] KB save failed:', kbErr);
          /* non-fatal */
        }
      }

      await appendA2AMessage(sessionId, {
        role: 'agent',
        agent,
        content: success
          ? `${agent} completed`
          : `${agent} failed: ${trunc(result.error ?? 'unknown error', 180)}`,
      });

      if (!success) {
        await setA2ASessionStatus(sessionId, 'failed');
        return;
      }
    } catch (error) {
      await updateA2AStep(sessionId, stepId, {
        status: 'failed',
        finishedAt: now(),
        error: error instanceof Error ? error.message : String(error),
      });

      await appendA2AMessage(sessionId, {
        role: 'agent',
        agent,
        content: `${agent} failed: ${trunc(error instanceof Error ? error.message : String(error), 180)}`,
      });

      await setA2ASessionStatus(sessionId, 'failed');
      return;
    }
  }

  await setA2ASessionStatus(sessionId, 'completed');
  await appendA2AMessage(sessionId, {
    role: 'orchestrator',
    content: 'Deep SEO campaign completed successfully',
  });
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await resolveAuth(req);
  if (!authResult.ok) return authResult.response;

  const payload = await req.json() as CampaignPayload;
  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const siteUrl = payload.siteUrl!.trim();
  const targetKeywords = payload.targetKeywords!.map(keyword => keyword.trim()).filter(Boolean);
  const idempotencyKey = parseIdempotencyKey(req);

  let sessionResult: Awaited<ReturnType<typeof createA2ASession>>;
  try {
    sessionResult = await createA2ASession({
      tenantId: authResult.ctx.tenant.id,
      orchestrator: DEEP_SEO_CHAIN[0],
      agents: [...DEEP_SEO_CHAIN],
      goal: `Deep SEO campaign for ${siteUrl} targeting: ${targetKeywords.join(', ')}`,
      metadata: {
        campaignType: 'deep_seo',
        siteUrl,
        targetKeywords,
      },
      idempotencyKey,
      idempotencyFingerprint: idempotencyKey ? buildCampaignFingerprint(siteUrl, targetKeywords) : undefined,
    });
  } catch (error) {
    if (error instanceof A2AIdempotencyConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const { session, reused } = sessionResult;

  if (!reused) {
    void executeDeepSeoCampaign(
      session.id,
      authResult.ctx.tenant as unknown as { id: string; name: string; tier: AgentType | string; model: string },
      siteUrl,
      targetKeywords,
    );
  }

  return NextResponse.json({
    ok: true,
    reused,
    sessionId: session.id,
    status: session.status,
    chain: DEEP_SEO_CHAIN,
  });
}
