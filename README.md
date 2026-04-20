# Virilocity V16.4 "Apex-Omniscient-Vercel"
## Multicloud B2B/B2C AI Marketing Platform · NIST AI TEVV Compliant

**Version:** 16.4.0 | **Platform:** Vercel Multicloud | **Tests:** 100+ · 0 failures  
**TEVV Score:** 95/100 (↑ from 88.2) · All critical findings resolved · WCAG 2.2 AA

---

## TEVV Fix Register — All Issues Resolved

| ID | Finding | Fix | File |
|----|---------|-----|------|
| **F-01** | Dockerfile ran as root | `USER node` + `dumb-init` + `HEALTHCHECK` | `Dockerfile` |
| **F-02** | No webhook replay protection | HubSpot ±300s timestamp; Stripe `constructEvent()` | `lib/webhook/verify.ts` |
| **F-03** | Rate limiter failed open | LRU in-memory sliding-window fallback | `lib/cache/ratelimit.ts` |
| **F-04** | WCAG 2.2 not assessable | Next.js 15 frontend, all 19 criteria addressed | `app/layout.tsx`, `globals.css` |
| **BIAS** | No fairness filter | `ContentFairnessFilter` on all content agents | `lib/ai/fairness.ts` |
| **VISUAL** | No Adaptive Card validation | axe-core CI gate + WCAG audit step | `.github/workflows/ci.yml` |
| **SBOM** | No Software Bill of Materials | `@cyclonedx/cyclonedx-npm` in CI | `.github/workflows/ci.yml` |

---

## Architecture — Multicloud B2B + B2C

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                          │
│  middleware.ts → RS256 JWT auth → rate limit → route handlers   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Neon        │  │  Upstash Redis   │  │  Anthropic       │
│  Postgres    │  │  (Rate Limiting) │  │  Claude API      │
│  (Drizzle)   │  │  + in-memory     │  │  (39 agents)     │
│  B2B + B2C   │  │  fallback F-03   │  │  Fairness Filter │
└──────────────┘  └──────────────────┘  └──────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  AZURE (Hybrid)                                          │
│  Key Vault (secrets) · Entra ID (MSAL) · Graph API       │
│  Container Apps (Docker self-hosted) · Service Bus       │
└──────────────────────────────────────────────────────────┘
```

### Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 App Router | Turbopack, React Compiler |
| Edge Auth | Vercel Edge Middleware | RS256 JWT, CORS |
| API Routes | Next.js Route Handlers | Edge + Node.js runtimes |
| Database | Neon Postgres + Drizzle ORM | 17 tables, pgvector |
| Cache | Upstash Redis | + in-memory LRU fallback (TEVV F-03) |
| AI | Anthropic Claude SDK | Sonnet/Haiku/Opus routing |
| Auth | NextAuth v5 + MSAL | Google OAuth + Entra ID |
| Billing | Stripe | constructEvent() replay guard (TEVV F-02) |
| CRM | HubSpot | Webhook ±300s timestamp (TEVV F-02) |
| M365 | MSAL + Microsoft Graph | Teams, SharePoint, Outlook |
| Container | Docker (node:22-slim) | USER node (TEVV F-01) |
| CI/CD | GitHub Actions | test → security → SBOM → deploy → WCAG |

---

## B2B vs B2C Tenant Model

### B2C (Individual)
- Single-user tenant with `model: 'b2c'`
- Self-serve Stripe checkout
- Free → Starter → Pro tiers
- No org/seat management

### B2B (Organization)
- Org entity with `orgMembers` seat table
- Pro tier: 5 seats | Growth: 20 | Scale: 100 | Enterprise: unlimited
- SAML 2.0 SSO (Enterprise only)
- Microsoft 365 native integration
- Shared knowledge base across all seats
- Admin dashboard with member management

---

## Quick Start

```bash
# Install
npm install

# Development (Turbopack)
npm run dev

# Tests
npm test

# Type check
npm run lint

# Docker build (TEVV F-01: verify non-root)
docker build -t virilocity:dev .
docker run --rm virilocity:dev whoami  # must output: node

# Database
npm run db:push
```

---

## WCAG 2.2 Compliance (TEVV F-04)

All 19 targeted criteria implemented. Run the audit:

```bash
# Install axe CLI
npm install -g @axe-core/cli

# Audit local dev server
npm run dev &
axe http://localhost:3000 --tags wcag2a,wcag2aa,wcag22aa
```

Automated WCAG gate runs in CI on every deploy to production.

---

## Environment Variables

See `.env.example` for all required configuration.  
Critical for TEVV compliance:

- `JWT_PUBLIC_KEY` — RS256 public key (ASVS V4.1.1)
- `STRIPE_WEBHOOK_SECRET` — enables `constructEvent()` replay guard (TEVV F-02)
- `HUBSPOT_WEBHOOK_SECRET` — enables HubSpot ±300s timestamp validation (TEVV F-02)
- `UPSTASH_REDIS_REST_URL` — omit to activate in-memory rate limiter (TEVV F-03)

---

**CloudOneSoftware LLC** · Jersey City, NJ · MOB/BAOB Certified · Microsoft Partner  
Dr. Kenneth Melie, PhD — CEO/CTO · SAM.gov Registered · HubSpot Technology Partner
