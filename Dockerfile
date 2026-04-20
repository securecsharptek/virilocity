# ─────────────────────────────────────────────────────────────────────────────
# Virilocity V16.4 Vercel Multicloud — Dockerfile
# TEVV FIX F-01: USER node instruction added (runs as non-root)
# Base: node:22-slim (minimal attack surface)
# Used for: self-hosted / hybrid cloud deployments alongside Vercel
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-slim AS base

# Install dumb-init for proper signal handling in containers
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependencies stage ────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
# Use --omit=dev in production; include devDeps for build step
RUN npm ci

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

# Create app directory and set ownership BEFORE switching user
RUN mkdir -p /app && chown node:node /app
WORKDIR /app

# Copy built output owned by node
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# ── TEVV F-01 FIX: Run as non-root node user ─────────────────────────────────
# Prevents container breakout privilege escalation if RCE occurs
USER node

EXPOSE 3000

# dumb-init: proper PID 1 / signal handling (avoids zombie processes)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# ── Health check ──────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
