import { createHmac, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getSecret, setSecret } from '../auth/keyvault';
import { db, tenants } from '../db/client';

type StatePurpose = 'm365_oauth';

export type M365TokenPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresOn?: Date | null;
  scope?: string;
};

const stateSecret = (): string => (process.env['AUTH_SECRET'] ?? 'dev-auth-secret').trim() || 'dev-auth-secret';

const sign = (payload: string): string =>
  createHmac('sha256', stateSecret()).update(payload).digest('hex');

export const buildSignedState = (tenantId: string, purpose: StatePurpose = 'm365_oauth'): string => {
  const ts = Date.now();
  const nonce = randomUUID();
  const payload = `${purpose}:${tenantId}:${ts}:${nonce}`;
  const sig = sign(payload);
  return `${payload}:${sig}`;
};

export const parseSignedState = (
  state: string,
  purpose: StatePurpose = 'm365_oauth',
  maxAgeMs = 10 * 60 * 1000,
): { ok: true; tenantId: string } | { ok: false; error: string } => {
  const parts = state.split(':');
  if (parts.length !== 5) return { ok: false, error: 'invalid_state_format' };

  const [p, tenantId, tsRaw, nonce, sig] = parts;
  if (!p || !tenantId || !tsRaw || !nonce || !sig) {
    return { ok: false, error: 'invalid_state_format' };
  }
  if (p !== purpose) return { ok: false, error: 'invalid_state_purpose' };

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return { ok: false, error: 'invalid_state_timestamp' };
  if (Date.now() - ts > maxAgeMs) return { ok: false, error: 'state_expired' };

  const payload = `${p}:${tenantId}:${ts}:${nonce}`;
  if (sign(payload) !== sig) return { ok: false, error: 'state_signature_mismatch' };

  return { ok: true, tenantId };
};

const tokenSecretNames = (tenantId: string) => ({
  access: `m365-access-${tenantId}`,
  refresh: `m365-refresh-${tenantId}`,
  expiresAt: `m365-expires-at-${tenantId}`,
  scope: `m365-scope-${tenantId}`,
});

const mergeMetadata = (current: unknown, patch: Record<string, unknown>): Record<string, unknown> => {
  const safe = current && typeof current === 'object' && !Array.isArray(current)
    ? current as Record<string, unknown>
    : {};
  return { ...safe, ...patch };
};

export const storeM365Token = async (tenantId: string, token: M365TokenPayload): Promise<void> => {
  const names = tokenSecretNames(tenantId);
  const expiresAt = token.expiresOn ? token.expiresOn.toISOString() : '';

  await Promise.all([
    setSecret(names.access, token.accessToken),
    setSecret(names.refresh, token.refreshToken ?? ''),
    setSecret(names.expiresAt, expiresAt),
    setSecret(names.scope, token.scope ?? ''),
  ]);

  try {
    const rows = await db.select({ metadata: tenants.metadata }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const existing = rows[0]?.metadata;
    await db
      .update(tenants)
      .set({
        metadata: mergeMetadata(existing, {
          m365TokenRef: names.access,
          m365ConnectedAt: new Date().toISOString(),
          m365ExpiresAt: expiresAt || null,
        }),
      })
      .where(eq(tenants.id, tenantId))
      .execute();
  } catch {
    // keep token persistence resilient in local/dev where db may be mocked/unavailable
  }
};

export const clearM365Token = async (tenantId: string): Promise<void> => {
  const names = tokenSecretNames(tenantId);

  await Promise.all([
    setSecret(names.access, ''),
    setSecret(names.refresh, ''),
    setSecret(names.expiresAt, ''),
    setSecret(names.scope, ''),
  ]);

  try {
    const rows = await db.select({ metadata: tenants.metadata }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const existing = rows[0]?.metadata;
    await db
      .update(tenants)
      .set({
        metadata: mergeMetadata(existing, {
          m365TokenRef: null,
          m365ConnectedAt: null,
          m365ExpiresAt: null,
          m365DisconnectedAt: new Date().toISOString(),
        }),
      })
      .where(eq(tenants.id, tenantId))
      .execute();
  } catch {
    // no-op in test/dev if db unavailable
  }
};

export const getM365ConnectionStatus = async (tenantId: string): Promise<{
  connected: boolean;
  expiresAt: string | null;
  source: 'keyvault';
}> => {
  const names = tokenSecretNames(tenantId);
  const [accessToken, expiresAtRaw] = await Promise.all([
    getSecret(names.access).catch(() => ''),
    getSecret(names.expiresAt).catch(() => ''),
  ]);

  const expiresAt = expiresAtRaw?.trim() || null;
  if (!accessToken?.trim()) return { connected: false, expiresAt, source: 'keyvault' };

  if (!expiresAt) return { connected: true, expiresAt: null, source: 'keyvault' };

  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) return { connected: true, expiresAt, source: 'keyvault' };

  return { connected: Date.now() < expiry, expiresAt, source: 'keyvault' };
};
