// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Cron Autopilot Route
// GET /api/cron/autopilot — Vercel Cron (daily at 06:00 UTC)
// Secured with CRON_SECRET header
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq, gte, inArray } from 'drizzle-orm';
import { runAutopilot, AUTOPILOT_TASKS } from '../../../../lib/agents/autopilot';
import type { Tenant, Tier, TenantModel, AgentType } from '../../../../lib/types/index';
import { getTenantDashboardState, setTenantDashboardState } from '../../../../lib/db/dashboard-state';
import { getSecret } from '../../../../lib/auth/keyvault';
import { db, tenants, agentExecutions, kbDocuments as kbDocumentsTable } from '../../../../lib/db/client';
import { now, uid } from '../../../../lib/utils/index';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 300; // 5 min budget for all tenants

type CronAutopilotState = {
  autopilot: {
    running: boolean;
    paused: boolean;
    stopRequested: boolean;
    nextRunAt: number;
    lastRunSummary: {
      completedTasks: number;
      postsCreated: number;
      hitlPending: number;
      durationText: string;
    };
    tasks: Array<{
      agent: string;
      task: string;
      model: string;
      status: 'scheduled' | 'running' | 'success' | 'failed' | 'skipped' | 'hitl';
    }>;
  };
  contacts: {
    all: Array<{
      id: string;
      stage: 'Customer' | 'SQL' | 'MQL' | 'Lead';
    }>;
  };
  kbDocuments: Array<{
    id: string;
    category: 'product-docs' | 'brand' | 'competitor-intel';
    title: string;
  }>;
  settings: {
    integrations: Array<{
      name: string;
      statusText: string;
    }>;
  };
};

const CRON_STATE_DEFAULT: CronAutopilotState = {
  autopilot: {
    running: false,
    paused: false,
    stopRequested: false,
    nextRunAt: 0,
    lastRunSummary: {
      completedTasks: 0,
      postsCreated: 0,
      hitlPending: 0,
      durationText: '—',
    },
    tasks: [],
  },
  contacts: { all: [] },
  kbDocuments: [],
  settings: { integrations: [] },
};

const toTenant = (row: typeof tenants.$inferSelect): Tenant => {
  const tier = (row.tier as Tier | undefined) ?? 'free';
  const model = (row.model as TenantModel | undefined) ?? 'b2c';
  const status = row.status === 'suspended' || row.status === 'trial' ? row.status : 'active';
  const metadata = row.metadata && typeof row.metadata === 'object'
    ? row.metadata as Record<string, unknown>
    : undefined;

  return {
    id: row.id,
    name: row.name,
    tier,
    model,
    status,
    ownerId: row.ownerId ?? undefined,
    orgId: row.orgId ?? undefined,
    metadata,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
};

const assembleTenantContext = (store: CronAutopilotState, tenant: Tenant) => {
  const domainBase = tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'workspace';
  const siteUrl = `https://${domainBase}.com`;

  const kbKeywords = store.kbDocuments
    .filter(d => d.category === 'product-docs')
    .flatMap(d => d.title.toLowerCase().split(/\s+/))
    .filter(w => w.length > 4)
    .slice(0, 5);

  const targetKeywords = kbKeywords.length >= 3
    ? kbKeywords
    : ['ai marketing automation', 'b2b saas marketing', 'marketing ai agents'];

  const contacts = store.contacts.all;
  const mqls = contacts.filter(c => c.stage === 'MQL').length;
  const sqls = contacts.filter(c => c.stage === 'SQL').length;

  const hubspotStatus = store.settings.integrations.find(i => i.name === 'HubSpot CRM');
  const hubspotConnected = hubspotStatus?.statusText?.startsWith('Connected') ?? false;

  return {
    siteUrl,
    targetKeywords,
    contactCount: contacts.length,
    mqls,
    sqls,
    hubspotConnected,
    kbDocs: store.kbDocuments.slice(0, 10).map(d => ({
      name:     d.title,
      category: d.category,
      content:  (d as unknown as { content?: string }).content ?? '',
    })),
  };
};

const persistAutopilotRun = async (
  tenantId: string,
  result: {
    executions: Array<{
      id: string;
      tenantId: string;
      agentType: AgentType;
      model: string;
      status: 'success' | 'failed' | 'skipped';
      inputSummary?: string;
      outputSummary?: string;
      durationMs: number;
      error?: string;
      fairnessScore?: number;
    }>;
  },
): Promise<void> => {
  if (result.executions.length === 0) return;

  await Promise.all(
    result.executions.map(exec =>
      db.insert(agentExecutions).values({
        id:            exec.id,
        tenantId:      exec.tenantId,
        agentType:     exec.agentType,
        model:         exec.model,
        status:        exec.status,
        inputSummary:  exec.inputSummary ?? null,
        outputSummary: exec.outputSummary ?? null,
        durationMs:    exec.durationMs,
        error:         exec.error ?? null,
        fairnessScore: exec.fairnessScore ?? null,
      }).onConflictDoNothing(),
    ),
  );

  const today = new Date().toLocaleDateString('en-CA');
  const artifactMap: Partial<Record<AgentType, { title: string; category: string }>> = {
    keyword_researcher: { title: `Keyword Opportunities — ${today}`, category: 'product-docs' },
    workspace_reporter: { title: `Workspace Report — ${today}`, category: 'product-docs' },
    backlink_outreach: { title: `Backlink Outreach Plan — ${today}`, category: 'competitor-intel' },
  };

  for (const [agentType, artifact] of Object.entries(artifactMap) as Array<[AgentType, { title: string; category: string }]>) {
    const exec = result.executions.find(e =>
      e.agentType === agentType && e.status === 'success' && e.outputSummary,
    );
    if (!exec?.outputSummary) continue;

    await db.insert(kbDocumentsTable).values({
      id: uid('kb'),
      tenantId,
      name: artifact.title,
      content: exec.outputSummary,
      category: artifact.category,
    }).onConflictDoNothing();
  }
};

const wasAlreadyRunToday = async (tenantId: string): Promise<boolean> => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const rows = await db
    .select({ n: count() })
    .from(agentExecutions)
    .where(and(
      eq(agentExecutions.tenantId, tenantId),
      gte(agentExecutions.createdAt, dayStart),
      inArray(agentExecutions.agentType, AUTOPILOT_TASKS),
    ));

  return Number(rows[0]?.n ?? 0) > 0;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Vercel Cron authentication
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'] ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startMs = Date.now();
  const summary = {
    cron: 'autopilot',
    startedAt: now(),
    tenantsTotal: 0,
    tenantsProcessed: 0,
    tenantsSucceeded: 0,
    tenantsFailed: 0,
    tenantsSkippedPaused: 0,
    tenantsSkippedNotDue: 0,
    tenantsSkippedAlreadyRunToday: 0,
    errors: [] as Array<{ tenantId: string; error: string }>,
  };

  try {
    const activeTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, 'active'));

    summary.tenantsTotal = activeTenants.length;

    for (const row of activeTenants) {
      const tenant = toTenant(row);

      try {
        const store = await getTenantDashboardState<CronAutopilotState>(tenant.id, CRON_STATE_DEFAULT);

        if (store.autopilot.paused) {
          summary.tenantsSkippedPaused += 1;
          continue;
        }

        const dueNow = !store.autopilot.nextRunAt || store.autopilot.nextRunAt <= Date.now();
        if (!dueNow) {
          summary.tenantsSkippedNotDue += 1;
          continue;
        }

        if (await wasAlreadyRunToday(tenant.id)) {
          summary.tenantsSkippedAlreadyRunToday += 1;
          continue;
        }

        store.autopilot.running = true;
        store.autopilot.stopRequested = false;
        await setTenantDashboardState(tenant.id, store);

        const hubspotToken = await getSecret(`hubspot-access-${tenant.id}`);
        const integrations = [
          { name: 'HubSpot CRM', statusText: hubspotToken ? 'Connected · Syncing' : 'Not Connected' },
        ];

        // Fetch KB doc content so agents receive brand/product context.
        const tenantKbDocs = await db.select({
          id:       kbDocumentsTable.id,
          title:    kbDocumentsTable.name,
          category: kbDocumentsTable.category,
          content:  kbDocumentsTable.content,
        }).from(kbDocumentsTable)
          .where(eq(kbDocumentsTable.tenantId, tenant.id))
          .limit(10);

        // Merge content into store kbDocuments so assembleTenantContext can use it.
        const storeWithKb = {
          ...store,
          settings: { integrations },
          kbDocuments: tenantKbDocs.map(d => ({
            id:       d.id,
            title:    d.title ?? '',
            category: (d.category ?? 'product-docs') as 'product-docs' | 'brand' | 'competitor-intel',
            content:  d.content ?? '',
          })),
        };

        const ctx = assembleTenantContext(storeWithKb, tenant);

        const result = await runAutopilot(tenant, { context: ctx });
        await persistAutopilotRun(tenant.id, result);

        store.autopilot.lastRunSummary = {
          completedTasks: result.totalTasks,
          postsCreated: Math.max(0, result.succeeded * 2),
          hitlPending: store.autopilot.lastRunSummary.hitlPending,
          durationText: `${Math.max(1, Math.round(result.durationMs / 60000))}m`,
        };
        store.autopilot.nextRunAt = Date.now() + 24 * 60 * 60 * 1000;
        store.autopilot.running = false;
        await setTenantDashboardState(tenant.id, store);

        summary.tenantsProcessed += 1;
        summary.tenantsSucceeded += 1;
      } catch (e) {
        try {
          const failedStore = await getTenantDashboardState<CronAutopilotState>(tenant.id, CRON_STATE_DEFAULT);
          failedStore.autopilot.running = false;
          await setTenantDashboardState(tenant.id, failedStore);
        } catch {
          // Best-effort cleanup only.
        }

        summary.tenantsProcessed += 1;
        summary.tenantsFailed += 1;
        summary.errors.push({
          tenantId: tenant.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } catch (e) {
    return NextResponse.json({
      ...summary,
      durationMs: Date.now() - startMs,
      fatal: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }

  return NextResponse.json({
    ...summary,
    durationMs: Date.now() - startMs,
  });
}
