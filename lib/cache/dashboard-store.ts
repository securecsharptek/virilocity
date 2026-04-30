import { Redis } from '@upstash/redis';

const STORE_PREFIX = 'virilocity:dashboard:v1';
const STORE_TTL_SECONDS = 60 * 60 * 24;

let cachedRedis: Redis | null | undefined;
const memoryStore = new Map<string, string>();

const getRedisClient = (): Redis | null => {
  if (cachedRedis !== undefined) return cachedRedis;

  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (!url || !token) {
    cachedRedis = null;
    return cachedRedis;
  }

  try {
    cachedRedis = new Redis({ url, token });
    return cachedRedis;
  } catch {
    cachedRedis = null;
    return cachedRedis;
  }
};

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const getStoreKey = (tenantId: string): string => `${STORE_PREFIX}:${tenantId}`;

export const getTenantDashboardState = async <T>(tenantId: string, initialValue: T): Promise<T> => {
  const key = getStoreKey(tenantId);
  const redis = getRedisClient();

  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Fall through to memory store and initial state.
    }
  }

  const memoryRaw = memoryStore.get(key);
  if (memoryRaw) {
    try {
      return JSON.parse(memoryRaw) as T;
    } catch {
      memoryStore.delete(key);
    }
  }

  return cloneValue(initialValue);
};

export const setTenantDashboardState = async <T>(tenantId: string, value: T): Promise<void> => {
  const key = getStoreKey(tenantId);
  const serialized = JSON.stringify(value);

  memoryStore.set(key, serialized);

  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, serialized, { ex: STORE_TTL_SECONDS });
  } catch {
    // Memory fallback is already updated.
  }
};

export const resetTenantDashboardStateMemory = (): void => {
  memoryStore.clear();
};
