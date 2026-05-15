import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import {
  A2AIdempotencyConflictError,
  KNOWN_AGENT_TYPES,
  createA2ASession,
  getA2ASession,
} from '../../../../lib/a2a/session-store';

export const runtime = 'nodejs';

type CreateSessionPayload = {
  orchestrator?: string;
  agents?: string[];
  goal?: string;
  metadata?: Record<string, unknown>;
};

type A2ASessionAuth = {
  tenant: {
    id: string;
    name: string;
  };
};

const AGENT_SET = new Set<string>(KNOWN_AGENT_TYPES);

const resolveAuth = async (req: NextRequest): Promise<{ ok: true; ctx: A2ASessionAuth } | { ok: false; response: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  const hasBearerToken = typeof authHeader === 'string' && /^Bearer\s+\S+$/i.test(authHeader.trim());

  if (hasBearerToken) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [status, body] = authErrorToHttp(bearerAuth.error);
      return { ok: false, response: NextResponse.json(body, { status }) };
    }

    return {
      ok: true,
      ctx: {
        tenant: {
          id: bearerAuth.ctx.tenant.id,
          name: bearerAuth.ctx.tenant.name,
        },
      },
    };
  }

  try {
    const session = await auth() as { tenantId?: string; user?: { email?: string | null } } | null;
    const tenantId = session?.tenantId ?? (session?.user?.email ? `tenant_${session.user.email}` : '');
    if (!tenantId) {
      return { ok: false, response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
    }

    return {
      ok: true,
      ctx: {
        tenant: {
          id: tenantId,
          name: session?.user?.email ?? 'Tenant',
        },
      },
    };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
  }
};

const parseIdempotencyKey = (req: NextRequest): string | undefined => {
  const raw = req.headers.get('x-idempotency-key')?.trim();
  if (!raw) return undefined;
  return raw.slice(0, 120);
};

const buildIdempotencyFingerprint = (payload: CreateSessionPayload): string => {
  const orchestrator = payload.orchestrator?.trim() ?? '';
  const goal = payload.goal?.trim() ?? '';
  const agents = Array.isArray(payload.agents) ? [...payload.agents].map(a => a.trim()) : [];
  const metadata = payload.metadata ?? {};

  return JSON.stringify({ orchestrator, goal, agents, metadata });
};

const validatePayload = (payload: CreateSessionPayload): string | null => {
  const orchestrator = payload.orchestrator?.trim();
  if (!orchestrator || !AGENT_SET.has(orchestrator)) {
    return 'orchestrator must be a valid agent type';
  }

  if (!Array.isArray(payload.agents) || payload.agents.length === 0) {
    return 'agents must be a non-empty array';
  }

  if (payload.agents.length > KNOWN_AGENT_TYPES.length) {
    return `agents length cannot exceed ${KNOWN_AGENT_TYPES.length}`;
  }

  const uniqueAgents = new Set(payload.agents);
  if (uniqueAgents.size !== payload.agents.length) {
    return 'agents must not contain duplicates';
  }

  const hasInvalidAgent = payload.agents.some(agent => !AGENT_SET.has(agent));
  if (hasInvalidAgent) {
    return 'agents contains unsupported agent types';
  }

  const goal = payload.goal?.trim() ?? '';
  if (goal.length < 10) {
    return 'goal must be at least 10 characters';
  }

  return null;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await resolveAuth(req);
  if (!authResult.ok) return authResult.response;

  const payload = await req.json() as CreateSessionPayload;
  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const idempotencyKey = parseIdempotencyKey(req);
  let sessionResult: Awaited<ReturnType<typeof createA2ASession>>;
  try {
    sessionResult = await createA2ASession({
      tenantId: authResult.ctx.tenant.id,
      orchestrator: payload.orchestrator!.trim(),
      agents: payload.agents!,
      goal: payload.goal!.trim(),
      metadata: payload.metadata,
      idempotencyKey,
      idempotencyFingerprint: idempotencyKey ? buildIdempotencyFingerprint(payload) : undefined,
    });
  } catch (error) {
    if (error instanceof A2AIdempotencyConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const { session, reused } = sessionResult;

  return NextResponse.json({
    ok: true,
    reused,
    session,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await resolveAuth(req);
  if (!authResult.ok) return authResult.response;

  const sessionId = req.nextUrl.searchParams.get('sessionId')?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 });
  }

  const session = await getA2ASession(sessionId);
  if (!session || session.tenantId !== authResult.ctx.tenant.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, session });
}
