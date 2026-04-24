# Virilocity V16.4 — Agent Instructions

Multicloud B2B/B2C AI marketing platform on Vercel + Azure + Neon.  
NIST AI TEVV compliant. See [README.md](README.md) for full architecture.

---

## Build & Test Commands

```bash
npm run dev          # Next.js 15 Turbopack dev server (localhost:3000)
npm run build        # Production build
npm run lint         # tsc --noEmit && next lint
npm test             # vitest run (all suites)
npm run test:watch   # vitest interactive
npm run test:coverage # vitest + V8 coverage (80% line/fn/stmt, 75% branch thresholds)
npm run db:push      # Drizzle schema push to Neon
npm run db:generate  # Generate Drizzle migration files
```

---

## MCP — Two Distinct Contexts

### 1. VS Code Dev Tooling (`.vscode/mcp.json`)
`chrome-devtools-mcp@0.23.0` runs via `npx` over `stdio`. This gives Copilot/agents access to Chrome DevTools in VS Code. It is **unrelated to the application runtime**.

### 2. Runtime Claude API MCP (`lib/ai/client.ts`)
`MCP_SERVERS` defines three remote MCP server endpoints for Claude tool use:

```ts
export const MCP_SERVERS = {
  hubspot: { name: 'hubspot-mcp', url: process.env['HUBSPOT_MCP_URL'] ?? '' },
  m365:    { name: 'm365-mcp',    url: process.env['M365_MCP_URL']    ?? '' },
  neon:    { name: 'neon-mcp',    url: process.env['NEON_MCP_URL']    ?? '' },
} as const;
```

**Critical gap:** `MCP_SERVERS` is currently **defined but never passed** to `anthropic.messages.create()`. To wire it up, the call needs:
- `betas: ['mcp-client-2025-04-04']` header flag
- `mcp_servers` parameter in the messages request body
- Env vars `HUBSPOT_MCP_URL`, `M365_MCP_URL`, `NEON_MCP_URL` added to `.env.local` and Vercel

No `@modelcontextprotocol/sdk` or `@anthropic-ai/mcp` packages are installed — MCP server-side integration uses the raw Anthropic SDK beta.

---

## AI / Agent Conventions

| Convention | Rule |
|---|---|
| **Model routing** | `enterprise → claude-opus-4-6`, `HAIKU_AGENTS → claude-haiku-4-5-20251001`, default `→ claude-sonnet-4-6`. See `lib/types/index.ts` `MODELS` and `HAIKU_AGENTS`. |
| **Fairness pipeline** | All `CONTENT_AGENTS` output passes through `applyFairnessFilter()` in `lib/ai/fairness.ts` before returning. Never bypass this for content agents. |
| **HITL gate** | `reddit_manager` is **permanently gated**: autopilot hardcodes `status: 'skipped'`; the API route returns `requiresHumanApproval: true`. Do not remove. |
| **Agent prompts** | Inline system prompts live in `AGENT_PROMPTS` in `lib/agents/autopilot.ts`. All instruct the model to **return JSON only**. |
| **Retry** | All Claude calls use `withRetry(3, 200)` (3 attempts, 200 ms exponential backoff) from `lib/utils/index.ts`. |
| **Circuit breaker** | `CircuitBreaker` in `lib/utils/index.ts` — 5 failures → open; 30 s half-open timeout. |
| **39 agent types** | Defined in `lib/types/index.ts` as `AgentType`. Tier limits enforce how many each tenant can run. |

### Autopilot Task Order (`lib/agents/autopilot.ts`)
11 tasks run **sequentially** to avoid Claude API burst limits:  
`keyword_researcher` → `trend_detector` → `hs_contact_enricher` → `bid_optimizer` → `backlink_outreach` → `social_listener` → `ai_visibility_tracker` → `churn_predictor` → `ab_test_orchestrator` → `workspace_reporter` → `cross_channel_orchestrator`

---

## Auth Architecture

- **Edge layer:** `middleware.ts` verifies RS256 JWT via `jose`, injects `x-tenant-id`, `x-user-id`, `x-org-id` headers. Public bypass routes include `/api/health/*`, `/api/billing/webhook`, `/api/hubspot/webhook`.
- **Route layer:** `lib/auth/middleware.ts` re-verifies the JWT inside route handlers.
- **Session layer:** NextAuth v5 (App Router), JWT strategy. Dashboard pages call `auth()` server action; unauthenticated → redirect `/auth/login`.
- **Azure:** MSAL `@azure/msal-node` for Entra ID / SAML 2.0 SSO (Enterprise tier only).

---

## Database

- **ORM:** Drizzle on Neon serverless Postgres — 17 tables, pgvector enabled.
- **Schema:** `lib/db/schema.ts`
- **Migrations output:** `infrastructure/migrations/`
- Always run `npm run db:push` after changing `lib/db/schema.ts` in dev.

---

## Security Invariants (Do Not Change)

| Invariant | Location |
|---|---|
| Webhook replay protection: ±300 s window + dedup via `webhookEvents` table | `lib/webhook/verify.ts` |
| Stripe replay guard: `constructEvent()` | `lib/integrations/stripe.ts` |
| Rate limit fails **closed** (in-memory fallback, never open) | `lib/cache/ratelimit.ts` |
| Dockerfile: `USER node` + `dumb-init` + `HEALTHCHECK` (non-root) | `Dockerfile` |
| Full OWASP security headers + CSP in `next.config.ts` | `next.config.ts` |

---

## Testing Conventions

- **Runner:** Vitest, `environment: node`.
- **No real network calls:** All I/O is mocked in `tests/setup.ts` — Anthropic SDK, Stripe, MSAL, Azure Key Vault, Neon DB. Upstash env vars are deleted → forces in-memory rate-limit path.
- **Coverage thresholds:** 80% line/function/statement, 75% branch.
- **Coverage scope:** `lib/**/*.ts` and `app/api/**/*.ts`. `lib/db/schema.ts` is excluded.
- Test suites: `tests/unit/`, `tests/integration/`, `tests/acceptance/`, `tests/regression/`, `tests/security/`, `tests/automation/`.

---

## Known Frontend Integration Gaps

See [/memories/repo/dashboard_frontend_integration_gaps.md] for detail. Key gaps:
- Dashboard KPIs and `AgentGrid` use hardcoded/static data — not wired to live APIs.
- "Run Autopilot" button on overview has no handler.
- Email login form points to wrong NextAuth v5 endpoint.
- KB list, org members, settings profile/API key actions are non-functional.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/ai/client.ts` | Claude SDK wrapper, model routing, MCP_SERVERS registry, fairness pipeline |
| `lib/agents/autopilot.ts` | 11-task autopilot loop, AGENT_PROMPTS, HITL skip for reddit_manager |
| `lib/types/index.ts` | AgentType enum (39), MODELS, HAIKU_AGENTS, TIER_LIMITS, REDDIT_REQUIRES_HUMAN_APPROVAL |
| `lib/db/schema.ts` | Drizzle schema — 17 tables |
| `lib/webhook/verify.ts` | Replay protection for HubSpot + Stripe |
| `lib/cache/ratelimit.ts` | Upstash Redis + in-memory LRU fallback |
| `middleware.ts` | Edge RS256 JWT verification, CORS, public route bypass list |
| `tests/setup.ts` | Global Vitest mocks — all external I/O |
| `next.config.ts` | Security headers, CSP, standalone output for Docker |
| `.vscode/mcp.json` | VS Code chrome-devtools-mcp server for local dev tooling |
