// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Azure Key Vault Client
// WAF Security: Managed Identity — zero stored credentials
// Circuit breaker + 5-min in-process cache
// ─────────────────────────────────────────────────────────────────────────────
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { SecretClient }  from '@azure/keyvault-secrets';
import { CircuitBreaker } from '../utils/index';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache       = new Map<string, { value: string; expires: number }>();
const _cb          = new CircuitBreaker(3, 60_000);
let   _client: SecretClient | null = null;

const LOCAL_STORE_PATH = path.join(process.cwd(), '.local-secrets.dev.json');

const isLocalFallbackMode = (): boolean =>
  process.env['NODE_ENV'] !== 'production' && !(process.env['AZURE_KEY_VAULT_URI'] ?? '').trim();

const readLocalSecrets = async (): Promise<Record<string, string>> => {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
};

const writeLocalSecrets = async (secrets: Record<string, string>): Promise<void> => {
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(secrets, null, 2), 'utf8');
};

const getClient = (): SecretClient => {
  if (_client) return _client;
  const uri = process.env['AZURE_KEY_VAULT_URI'] ?? '';
  if (!uri) throw new Error('AZURE_KEY_VAULT_URI not configured');
  const cred = process.env['AZURE_USE_MANAGED_IDENTITY'] === 'true'
    ? new ManagedIdentityCredential()
    : new DefaultAzureCredential();
  _client = new SecretClient(uri, cred);
  return _client;
};

export const getSecret = async (name: string): Promise<string> => {
  // L1: in-process cache
  const hit = _cache.get(name);
  if (hit && hit.expires > Date.now()) return hit.value;

  // L2: env var fallback (dev / CI)
  const envVal = process.env[name.toUpperCase().replace(/-/g, '_')];
  if (envVal) {
    _cache.set(name, { value: envVal, expires: Date.now() + CACHE_TTL_MS });
    return envVal;
  }

  // L2.5: local dev persistence fallback (no Azure Key Vault configured)
  if (isLocalFallbackMode()) {
    const localSecrets = await readLocalSecrets();
    const localVal = localSecrets[name] ?? '';
    if (localVal) {
      _cache.set(name, { value: localVal, expires: Date.now() + CACHE_TTL_MS });
    }
    return localVal;
  }

  // L3: Azure Key Vault with circuit breaker
  const secret = await _cb.call(() => getClient().getSecret(name));
  const value  = secret.value ?? '';
  _cache.set(name, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
};

export const setSecret = async (name: string, value: string): Promise<string> => {
  const isLocalFallback = isLocalFallbackMode();

  // Local development fallback: store in process cache when Key Vault is not configured.
  if (isLocalFallback) {
    _cache.set(name, { value, expires: Date.now() + CACHE_TTL_MS });
    // Keep process-env fallback compatible with getSecret L2 lookup.
    process.env[name.toUpperCase().replace(/-/g, '_')] = value;
    const localSecrets = await readLocalSecrets();
    localSecrets[name] = value;
    await writeLocalSecrets(localSecrets);
    return name;
  }

  const result = await _cb.call(() => getClient().setSecret(name, value));
  _cache.set(name, { value, expires: Date.now() + CACHE_TTL_MS });
  return result.name;
};

export const clearSecretCache = (): void => _cache.clear();

export const getSecrets = async (names: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  await Promise.all(names.map(async n => {
    try { out[n] = await getSecret(n); } catch { out[n] = ''; }
  }));
  return out;
};
