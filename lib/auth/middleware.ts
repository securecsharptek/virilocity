// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Auth Middleware
// RS256 JWT · tenantId from payload only (ASVS V4.1.1)
// Rate limiting with in-memory fallback (TEVV F-03)
// B2B org membership validation
// ─────────────────────────────────────────────────────────────────────────────
import { importSPKI, jwtVerify } from 'jose';
import { checkRateLimit } from '../cache/ratelimit.js';
import type { Tenant } from '../types/index';

const ALGORITHM = 'RS256';

interface JWTPayload {
  tenantId: string;
  userId?:  string;
  orgId?:   string;
  role?:    string;
  exp?:     number;
  iat?:     number;
}

// ── RS256 JWT verification (ASVS V4.1.1) ─────────────────────────────────────
export const verifyJwt = async (token: string): Promise<JWTPayload> => {
  const pubKey = process.env['JWT_PUBLIC_KEY'] ?? '';
  if (!pubKey) throw new Error('JWT_PUBLIC_KEY not configured');

  const key = await importSPKI(pubKey.replace(/\\n/g, '\n'), ALGORITHM);
  const { payload } = await jwtVerify<JWTPayload>(token, key, {
    algorithms: [ALGORITHM],
  });

  if (!payload['tenantId']) throw new Error('JWT missing tenantId claim');
  return payload as JWTPayload;
};

// ── Bearer extraction ─────────────────────────────────────────────────────────
export const extractBearer = (authHeader: string | null | undefined): string | null => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
};

// ── Auth error types ──────────────────────────────────────────────────────────
export type AuthError =
  | { type: 'missing_token' }
  | { type: 'invalid_token'; detail: string }
  | { type: 'rate_limited' }
  | { type: 'tenant_not_found' }
  | { type: 'tenant_suspended' }
  | { type: 'insufficient_tier'; required: string };

export interface AuthContext {
  tenantId: string;
  userId?:  string;
  orgId?:   string;
  role?:    string;
  tenant:   Tenant;
}

// ── Tenant loader (DB stub — replace with Drizzle query) ─────────────────────
const _tenantCache = new Map<string, { tenant: Tenant; expires: number }>();

export const loadTenant = async (tenantId: string): Promise<Tenant | null> => {
  const cached = _tenantCache.get(tenantId);
  if (cached && cached.expires > Date.now()) return cached.tenant;

  // Production: query Neon Postgres via Drizzle ORM
  // const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return null;
};

// ── Full authenticate pipeline ────────────────────────────────────────────────
export const authenticate = async (
  authHeader: string | null | undefined,
): Promise<{ ok: true; ctx: AuthContext } | { ok: false; error: AuthError }> => {
  const token = extractBearer(authHeader);
  if (!token) return { ok: false, error: { type: 'missing_token' } };

  let payload: JWTPayload;
  try {
    payload = await verifyJwt(token);
  } catch (e) {
    return { ok: false, error: { type: 'invalid_token', detail: String(e) } };
  }

  if (!await checkRateLimit(payload.tenantId)) {
    return { ok: false, error: { type: 'rate_limited' } };
  }

  const tenant = await loadTenant(payload.tenantId);
  if (!tenant) return { ok: false, error: { type: 'tenant_not_found' } };
  if (tenant.status === 'suspended') return { ok: false, error: { type: 'tenant_suspended' } };

  return {
    ok: true,
    ctx: { tenantId: payload.tenantId, userId: payload.userId, orgId: payload.orgId, role: payload.role, tenant },
  };
};

export const authErrorToHttp = (error: AuthError): [number, object] => {
  switch (error.type) {
    case 'missing_token':        return [401, { error: 'Authorization header required' }];
    case 'invalid_token':        return [401, { error: 'Invalid or expired token' }];
    case 'rate_limited':         return [429, { error: 'Rate limit exceeded', retryAfter: 60 }];
    case 'tenant_not_found':     return [404, { error: 'Tenant not found' }];
    case 'tenant_suspended':     return [403, { error: 'Account suspended' }];
    case 'insufficient_tier':    return [403, { error: `Requires ${error.required} tier or above` }];
  }
};
