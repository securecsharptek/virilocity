// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Azure Key Vault Client
// WAF Security: Managed Identity — zero stored credentials
// Circuit breaker + 5-min in-process cache
// ─────────────────────────────────────────────────────────────────────────────
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { SecretClient }  from '@azure/keyvault-secrets';
import { CircuitBreaker } from '../utils/index';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache       = new Map<string, { value: string; expires: number }>();
const _cb          = new CircuitBreaker(3, 60_000);
let   _client: SecretClient | null = null;

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

  // L3: Azure Key Vault with circuit breaker
  const secret = await _cb.call(() => getClient().getSecret(name));
  const value  = secret.value ?? '';
  _cache.set(name, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
};

export const setSecret = async (name: string, value: string): Promise<string> => {
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
