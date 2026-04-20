// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Rate Limiting  ·  TEVV FIX: F-03
// Closes: Adversarial Robustness CONDITIONAL PASS (76/100) → PASS
//
// Fix: In-memory sliding-window fallback when Upstash/Redis is unavailable.
// Primary: @upstash/ratelimit (Vercel Edge compatible, serverless Redis)
// Fallback: LRU-map sliding window (no external dependency)
// ─────────────────────────────────────────────────────────────────────────────
import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

const RATE_LIMIT_PER_MIN = 60;
const WINDOW_MS          = 60_000;

// ── Primary: Upstash Redis rate limiter (Vercel Edge compatible) ──────────────
let _upstashLimiter: Ratelimit | null = null;

const getUpstashLimiter = (): Ratelimit | null => {
  if (_upstashLimiter) return _upstashLimiter;
  const url   = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (!url || !token) return null;
  try {
    _upstashLimiter = new Ratelimit({
      redis:     new Redis({ url, token }),
      limiter:   Ratelimit.slidingWindow(RATE_LIMIT_PER_MIN, '60 s'),
      analytics: false,
      prefix:    'virilocity:rl',
    });
    return _upstashLimiter;
  } catch { return null; }
};

// ── TEVV F-03 FIX: In-memory sliding-window fallback ─────────────────────────
// Uses a Map of (tenantId → timestamps[]) — O(n) per call but n ≤ 60.
// Evicts stale entries every 5 minutes to prevent unbounded growth.
const _memWindows = new Map<string, number[]>();
let   _lastEvict  = Date.now();

const evictStale = (): void => {
  const now = Date.now();
  if (now - _lastEvict < 300_000) return; // evict every 5 min
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of _memWindows.entries()) {
    const fresh = timestamps.filter(t => t > cutoff);
    if (fresh.length === 0) _memWindows.delete(key);
    else _memWindows.set(key, fresh);
  }
  _lastEvict = now;
};

const memoryRateLimit = (tenantId: string): boolean => {
  evictStale();
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits   = (_memWindows.get(tenantId) ?? []).filter(t => t > cutoff);
  if (hits.length >= RATE_LIMIT_PER_MIN) return false; // rate limited
  hits.push(now);
  _memWindows.set(tenantId, hits);
  return true;
};

// ── Unified rate limiter (auto-falls back) ────────────────────────────────────
export const checkRateLimit = async (tenantId: string): Promise<boolean> => {
  const limiter = getUpstashLimiter();

  if (limiter) {
    try {
      const { success } = await limiter.limit(tenantId);
      return success;
    } catch {
      // Upstash unavailable — fall through to in-memory fallback (TEVV F-03)
    }
  }

  // TEVV F-03: in-memory fallback — never fails open
  return memoryRateLimit(tenantId);
};

// ── Reset in-memory state (testing) ──────────────────────────────────────────
export const resetMemoryRateLimiter = (): void => _memWindows.clear();
