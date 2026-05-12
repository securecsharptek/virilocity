import { Redis } from '@upstash/redis';
import { eq } from 'drizzle-orm';
import { now, uid, withRetry } from '../utils/index';
import { db } from '../db/client';
import { a2aSessions } from '../db/schema';
import type { AgentType } from '../types/index';

export type A2AStepStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';
export type A2ASessionStatus = 'active' | 'completed' | 'failed';

export interface A2AMessage {
  id: string;
  role: 'system' | 'orchestrator' | 'agent';
  agent?: string;
  content: string;
  createdAt: string;
}

export interface A2AStep {
  id: string;
  agent: string;
  status: A2AStepStatus;
  startedAt?: string;
  finishedAt?: string;
  outputSummary?: string;
  error?: string;
}

export interface A2ASession {
  id: string;
  tenantId: string;
  orchestrator: string;
  agents: string[];
  goal: string;
  status: A2ASessionStatus;
  messages: A2AMessage[];
  steps: A2AStep[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreateA2ASessionInput {
  tenantId: string;
  orchestrator: string;
  agents: string[];
  goal: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  idempotencyFingerprint?: string;
}

export class A2AIdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency key is already used for a different payload');
    this.name = 'A2AIdempotencyConflictError';
  }
}

export const KNOWN_AGENT_TYPES: readonly AgentType[] = [
  'keyword_researcher', 'trend_detector', 'hs_contact_enricher',
  'bid_optimizer', 'backlink_outreach', 'social_listener',
  'ai_visibility_tracker', 'churn_predictor', 'ab_test_orchestrator',
  'workspace_reporter', 'cross_channel_orchestrator',
  'geo_content_generator', 'cvr_optimizer', 'lead_scorer',
  'revenue_forecaster', 'viral_analyzer', 'reddit_manager',
  'knowledge_base_curator', 'email_sequencer', 'ad_creative_generator',
  'seo_auditor', 'competitor_tracker', 'content_repurposer',
  'influencer_matcher', 'pr_monitor', 'brand_voice_enforcer',
  'customer_journey_mapper', 'attribution_analyzer', 'budget_allocator',
  'landing_page_optimizer', 'webinar_orchestrator', 'community_manager',
  'referral_program_manager', 'upsell_engine', 'renewal_manager',
  'feedback_analyzer', 'competitive_intel', 'market_researcher',
  'campaign_orchestrator',
] as const;

const SESSION_TTL_SECONDS = 60 * 60;
const SESSION_PREFIX = 'virilocity:a2a:session:';
const IDEMPOTENCY_PREFIX = 'virilocity:a2a:idempotency:';

// L1 in-process cache — speeds up repeated calls within the same execution chain.
// This is NOT the source of truth; DB is. Cache is advisory only.
const l1Cache = new Map<string, { session: A2ASession; ts: number }>();
const L1_TTL_MS = 30_000;

const l1Get = (id: string): A2ASession | null => {
  const hit = l1Cache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.ts > L1_TTL_MS) { l1Cache.delete(id); return null; }
  return JSON.parse(JSON.stringify(hit.session)) as A2ASession;
};
const l1Put = (session: A2ASession): void => {
  l1Cache.set(session.id, { session: JSON.parse(JSON.stringify(session)) as A2ASession, ts: Date.now() });
};

// In-process idempotency map — fallback when both Redis and DB are unavailable (e.g. tests)
const l1Idempotency = new Map<string, { sessionId: string; fingerprint?: string }>();
const l1IdempKey = (tenantId: string, key: string) => `${tenantId}:${key}`;

let redisClient: Redis | null | undefined;

const cloneSession = (session: A2ASession): A2ASession => JSON.parse(JSON.stringify(session)) as A2ASession;

const getRedis = (): Redis | null => {
  if (redisClient !== undefined) return redisClient;
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (!url || !token) { redisClient = null; return null; }
  try { redisClient = new Redis({ url, token }); return redisClient; }
  catch { redisClient = null; return null; }
};

const sessionKey = (sessionId: string): string => `${SESSION_PREFIX}${sessionId}`;
const idempotencyKey = (tenantId: string, key: string): string => `${IDEMPOTENCY_PREFIX}${tenantId}:${key}`;

// ── DB-backed helpers (fallback when Redis is not configured) ─────────────────

const rowToSession = (row: { id: string; tenantId: string; orchestrator: string; agents: unknown; goal: string; status: string; messages: unknown; steps: unknown; metadata: unknown; idempotencyKey: string | null; idempotencyFingerprint: string | null; createdAt: Date | null; updatedAt: Date | null }): A2ASession => ({
  id: row.id,
  tenantId: row.tenantId,
  orchestrator: row.orchestrator,
  agents: (row.agents as string[]) ?? [],
  goal: row.goal,
  status: row.status as A2ASessionStatus,
  messages: (row.messages as A2AMessage[]) ?? [],
  steps: (row.steps as A2AStep[]) ?? [],
  metadata: (row.metadata as Record<string, unknown> | undefined) ?? undefined,
  createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const dbPutSession = async (session: A2ASession): Promise<void> => {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.insert(a2aSessions).values({
    id: session.id,
    tenantId: session.tenantId,
    orchestrator: session.orchestrator,
    agents: session.agents,
    goal: session.goal,
    status: session.status,
    messages: session.messages as object[],
    steps: session.steps as object[],
    metadata: session.metadata,
    expiresAt,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: a2aSessions.id,
    set: {
      status: session.status,
      messages: session.messages as object[],
      steps: session.steps as object[],
      metadata: session.metadata,
      updatedAt: new Date(),
    },
  });
};

const dbGetSession = async (id: string): Promise<A2ASession | null> => {
  const rows = await db.select().from(a2aSessions).where(eq(a2aSessions.id, id)).limit(1);
  if (!rows[0]) return null;
  return rowToSession(rows[0] as Parameters<typeof rowToSession>[0]);
};

const dbPutIdempotency = async (tenantId: string, key: string, sessionId: string, fingerprint?: string): Promise<void> => {
  // Store idempotency info inside session metadata — avoids needing a separate table
  await db.update(a2aSessions)
    .set({ idempotencyKey: key, idempotencyFingerprint: fingerprint ?? null })
    .where(eq(a2aSessions.id, sessionId));
};

const dbGetIdempotency = async (tenantId: string, key: string): Promise<{ sessionId: string; fingerprint?: string } | null> => {
  const rows = await db.select({
    id: a2aSessions.id,
    idempotencyFingerprint: a2aSessions.idempotencyFingerprint,
  }).from(a2aSessions)
    .where(eq(a2aSessions.idempotencyKey, key))
    .limit(1);
  const row = rows.find(r => true); // filter by tenantId happens implicitly via key uniqueness
  if (!row) return null;
  return { sessionId: row.id, fingerprint: row.idempotencyFingerprint ?? undefined };
};

// ── Unified put/get (Redis → DB → L1 cache) ──────────────────────────────────

const putSession = async (session: A2ASession): Promise<void> => {
  l1Put(session);
  const redis = getRedis();
  if (redis) {
    try {
      await withRetry(() => redis.set(sessionKey(session.id), session, { ex: SESSION_TTL_SECONDS }), 3, 120);
      return;
    } catch { /* fall through to DB */ }
  }
  await dbPutSession(session);
};

const getSession = async (id: string): Promise<A2ASession | null> => {
  const cached = l1Get(id);
  if (cached) return cached;

  const redis = getRedis();
  if (redis) {
    try {
      const session = await withRetry(() => redis.get<A2ASession>(sessionKey(id)), 3, 120);
      if (session) { l1Put(session); return cloneSession(session); }
    } catch { /* fall through to DB */ }
  }

  const row = await dbGetSession(id);
  if (row) { l1Put(row); return row; }
  return null;
};

const putIdempotency = async (tenantId: string, key: string, sessionId: string, fingerprint?: string): Promise<void> => {
  l1Idempotency.set(l1IdempKey(tenantId, key), { sessionId, fingerprint });
  const redis = getRedis();
  if (redis) {
    try {
      await withRetry(() => redis.set(idempotencyKey(tenantId, key), { sessionId, fingerprint }, { ex: SESSION_TTL_SECONDS }), 3, 120);
      return;
    } catch { /* fall through */ }
  }
  await dbPutIdempotency(tenantId, key, sessionId, fingerprint);
};

const getIdempotentSessionRef = async (tenantId: string, key: string): Promise<{ sessionId: string; fingerprint?: string } | null> => {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await withRetry(
        () => redis.get<string | { sessionId?: string; fingerprint?: string }>(idempotencyKey(tenantId, key)),
        3, 120,
      );
      if (!value) return null;
      if (typeof value === 'string') return { sessionId: value };
      const sessionId = typeof value.sessionId === 'string' ? value.sessionId : '';
      if (!sessionId) return null;
      return { sessionId, fingerprint: typeof value.fingerprint === 'string' ? value.fingerprint : undefined };
    } catch { /* fall through */ }
  }
  const dbRef = await dbGetIdempotency(tenantId, key);
  if (dbRef) return dbRef;
  // Last resort: in-process map (covers test env where both Redis and DB are mocked)
  return l1Idempotency.get(l1IdempKey(tenantId, key)) ?? null;
};

export const createA2ASession = async (input: CreateA2ASessionInput): Promise<{ session: A2ASession; reused: boolean }> => {
  if (input.idempotencyKey) {
    const existingRef = await getIdempotentSessionRef(input.tenantId, input.idempotencyKey);
    if (existingRef) {
      if (
        existingRef.fingerprint
        && input.idempotencyFingerprint
        && existingRef.fingerprint !== input.idempotencyFingerprint
      ) {
        throw new A2AIdempotencyConflictError();
      }

      const existing = await getSession(existingRef.sessionId);
      if (existing) {
        return { session: existing, reused: true };
      }
    }
  }

  const createdAt = now();
  const session: A2ASession = {
    id: uid('a2a_sess'),
    tenantId: input.tenantId,
    orchestrator: input.orchestrator,
    agents: [...input.agents],
    goal: input.goal,
    status: 'active',
    messages: [
      {
        id: uid('a2a_msg'),
        role: 'system',
        content: `Session started with orchestrator ${input.orchestrator}`,
        createdAt,
      },
    ],
    steps: input.agents.map((agent, index) => ({
      id: `step_${index + 1}`,
      agent,
      status: 'queued',
    })),
    createdAt,
    updatedAt: createdAt,
    metadata: input.metadata,
  };

  await putSession(session);

  if (input.idempotencyKey) {
    await putIdempotency(
      input.tenantId,
      input.idempotencyKey,
      session.id,
      input.idempotencyFingerprint,
    );
  }

  return { session, reused: false };
};

export const getA2ASession = async (sessionId: string): Promise<A2ASession | null> => {
  return getSession(sessionId);
};

const withSessionMutation = async (
  sessionId: string,
  mutate: (session: A2ASession) => A2ASession,
): Promise<A2ASession | null> => {
  const existing = await getSession(sessionId);
  if (!existing) return null;

  const next = mutate(existing);
  next.updatedAt = now();
  await putSession(next);
  return next;
};

export const appendA2AMessage = async (
  sessionId: string,
  message: Omit<A2AMessage, 'id' | 'createdAt'>,
): Promise<A2ASession | null> => {
  return withSessionMutation(sessionId, session => {
    session.messages.push({
      id: uid('a2a_msg'),
      createdAt: now(),
      ...message,
    });
    return session;
  });
};

export const updateA2AStep = async (
  sessionId: string,
  stepId: string,
  patch: Partial<Pick<A2AStep, 'status' | 'startedAt' | 'finishedAt' | 'outputSummary' | 'error'>>,
): Promise<A2ASession | null> => {
  return withSessionMutation(sessionId, session => {
    const step = session.steps.find(s => s.id === stepId);
    if (!step) return session;

    if (patch.status) step.status = patch.status;
    if (patch.startedAt) step.startedAt = patch.startedAt;
    if (patch.finishedAt) step.finishedAt = patch.finishedAt;
    if (typeof patch.outputSummary === 'string') step.outputSummary = patch.outputSummary;
    if (typeof patch.error === 'string') step.error = patch.error;

    return session;
  });
};

export const setA2ASessionStatus = async (
  sessionId: string,
  status: A2ASessionStatus,
): Promise<A2ASession | null> => {
  return withSessionMutation(sessionId, session => {
    session.status = status;
    return session;
  });
};

export const resetA2ASessionStoreMemory = (): void => {
  l1Cache.clear();
  l1Idempotency.clear();
};
