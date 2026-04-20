// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Shared Utilities
// ─────────────────────────────────────────────────────────────────────────────

// ── ISO timestamp ─────────────────────────────────────────────────────────────
export const now = (): string => new Date().toISOString();

// ── UID (collision-safe) ──────────────────────────────────────────────────────
let _counter = 0;
export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${(++_counter).toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

// ── Clamp ─────────────────────────────────────────────────────────────────────
export const clamp = (n: number, min: number, max: number): number =>
  Math.min(Math.max(n, min), max);

// ── Round to N decimal places ─────────────────────────────────────────────────
export const round2 = (n: number): number => Math.round(n * 100) / 100;

// ── Truncate string ───────────────────────────────────────────────────────────
export const trunc = (s: string, max = 200): string =>
  s.length <= max ? s : `${s.slice(0, max)}…`;

// ── Safe JSON parse ───────────────────────────────────────────────────────────
export const safeJSON = <T>(raw: string): T | null => {
  try { return JSON.parse(raw) as T; } catch { return null; }
};

// ── Sleep ─────────────────────────────────────────────────────────────────────
export const sleep = (ms: number): Promise<void> =>
  new Promise(r => setTimeout(r, ms));

// ── Exponential backoff retry ─────────────────────────────────────────────────
export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelay = 200,
): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(baseDelay * Math.pow(2, i));
    }
  }
  throw lastErr;
};

// ── Circuit breaker ───────────────────────────────────────────────────────────
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold = 5,
    private readonly timeoutMs = 30_000,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeoutMs) this.state = 'half-open';
      else throw new Error('Circuit breaker OPEN');
    }
    try {
      const result = await fn();
      if (this.state === 'half-open') { this.failures = 0; this.state = 'closed'; }
      return result;
    } catch (e) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'open';
      throw e;
    }
  }

  reset() { this.failures = 0; this.state = 'closed'; }
  get isOpen() { return this.state === 'open'; }
}

// ── Within limit (-1 = unlimited) ────────────────────────────────────────────
export const withinLimit = (used: number, limit: number): boolean =>
  limit === -1 || used < limit;
