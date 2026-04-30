// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Database Schema (Neon Postgres + Drizzle ORM)
// B2B: orgs, orgMembers | B2C: individual tenants
// +fairnessLogs (TEVV Bias fix) | +webhookEvents (TEVV F-02 replay guard)
// ─────────────────────────────────────────────────────────────────────────────
import { pgTable, text, integer, real, boolean, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';

// ── Organizations (B2B) ───────────────────────────────────────────────────────
export const orgs = pgTable('orgs', {
  id:         text('id').primaryKey(),
  name:       text('name').notNull(),
  slug:       text('slug').notNull().unique(),
  tier:       text('tier').notNull().default('free'),
  status:     text('status').notNull().default('active'),
  ssoConfig:  jsonb('sso_config'),                  // SAML / Entra config
  m365TenantId: text('m365_tenant_id'),
  createdAt:  timestamp('created_at').defaultNow(),
});

// ── Org Members (B2B seats) ───────────────────────────────────────────────────
export const orgMembers = pgTable('org_members', {
  id:       text('id').primaryKey(),
  orgId:    text('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId:   text('user_id').notNull(),
  role:     text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
}, t => ({ uniq: unique().on(t.orgId, t.userId) }));

// ── Tenants (B2B org-linked or B2C individual) ────────────────────────────────
export const tenants = pgTable('tenants', {
  id:       text('id').primaryKey(),
  name:     text('name').notNull(),
  tier:     text('tier').notNull().default('free'),
  model:    text('model').notNull().default('b2c'),  // 'b2b' | 'b2c'
  status:   text('status').notNull().default('active'),
  ownerId:  text('owner_id'),
  orgId:    text('org_id').references(() => orgs.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, t => ({ orgIdx: index('tenant_org_idx').on(t.orgId) }));

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name'),
  avatarUrl:    text('avatar_url'),
  provider:     text('provider'),          // 'google' | 'entra' | 'email'
  tenantId:     text('tenant_id').references(() => tenants.id),
  lastLoginAt:  timestamp('last_login_at'),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ── Dashboard State (tenant-scoped persisted UI state) ──────────────────────
export const dashboardStates = pgTable('dashboard_states', {
  tenantId:  text('tenant_id').primaryKey(),
  state:     jsonb('state').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, t => ({
  updatedIdx: index('dashboard_states_updated_idx').on(t.updatedAt),
}));

// ── Agent Executions ──────────────────────────────────────────────────────────
export const agentExecutions = pgTable('agent_executions', {
  id:            text('id').primaryKey(),
  tenantId:      text('tenant_id').notNull().references(() => tenants.id),
  agentType:     text('agent_type').notNull(),
  model:         text('model').notNull(),
  status:        text('status').notNull().default('pending'),
  inputSummary:  text('input_summary'),
  outputSummary: text('output_summary'),
  durationMs:    integer('duration_ms'),
  error:         text('error'),
  fairnessScore: real('fairness_score'),    // TEVV Bias fix — stored on every content agent
  createdAt:     timestamp('created_at').defaultNow(),
}, t => ({ tenantIdx: index('exec_tenant_idx').on(t.tenantId) }));

// ── TEVV F-02: Webhook event deduplication (replay guard) ─────────────────────
export const webhookEvents = pgTable('webhook_events', {
  id:           text('id').primaryKey(),    // idempotency key from header
  source:       text('source').notNull(),   // 'hubspot' | 'stripe' | 'graph'
  receivedAt:   timestamp('received_at').defaultNow(),
  processed:    boolean('processed').notNull().default(false),
  tenantId:     text('tenant_id'),
}, t => ({
  sourceIdIdx: unique().on(t.source, t.id),  // prevents duplicate processing
}));

// ── TEVV Bias: Fairness audit log ─────────────────────────────────────────────
export const fairnessLogs = pgTable('fairness_logs', {
  id:          text('id').primaryKey(),
  auditId:     text('audit_id').notNull().unique(),
  tenantId:    text('tenant_id').notNull(),
  agentType:   text('agent_type').notNull(),
  score:       real('score').notNull(),
  passed:      boolean('passed').notNull(),
  flagCount:   integer('flag_count').notNull().default(0),
  flags:       jsonb('flags'),
  createdAt:   timestamp('created_at').defaultNow(),
}, t => ({
  tenantIdx: index('fairness_tenant_idx').on(t.tenantId),
  passedIdx: index('fairness_passed_idx').on(t.passed),
}));

// ── HubSpot Contacts ──────────────────────────────────────────────────────────
export const hsContacts = pgTable('hs_contacts', {
  id:             text('id').primaryKey(),
  tenantId:       text('tenant_id').notNull().references(() => tenants.id),
  hsId:           text('hs_id').notNull(),
  email:          text('email'),
  lifecycleStage: text('lifecycle_stage'),
  leadScore:      integer('lead_score').default(0),
  enrichedAt:     timestamp('enriched_at'),
  createdAt:      timestamp('created_at').defaultNow(),
});

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id:         text('id').primaryKey(),
  tenantId:   text('tenant_id').notNull().references(() => tenants.id),
  stripeId:   text('stripe_id').notNull().unique(),
  amount:     integer('amount').notNull(),
  currency:   text('currency').notNull().default('usd'),
  status:     text('status').notNull(),
  tier:       text('tier').notNull(),
  cycle:      text('cycle').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
});

// ── Content Pages ─────────────────────────────────────────────────────────────
export const contentPages = pgTable('content_pages', {
  id:           text('id').primaryKey(),
  tenantId:     text('tenant_id').notNull().references(() => tenants.id),
  title:        text('title').notNull(),
  slug:         text('slug').notNull(),
  bodyMd:       text('body_md'),
  seoScore:     real('seo_score'),
  geoScore:     real('geo_score'),
  fairnessScore: real('fairness_score'),   // TEVV Bias
  publishedAt:  timestamp('published_at'),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ── Knowledge Base ────────────────────────────────────────────────────────────
export const kbDocuments = pgTable('kb_documents', {
  id:        text('id').primaryKey(),
  tenantId:  text('tenant_id').notNull().references(() => tenants.id),
  name:      text('name').notNull(),
  content:   text('content').notNull(),
  category:  text('category').notNull(),
  vectorId:  text('vector_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Social Mentions ───────────────────────────────────────────────────────────
export const socialMentions = pgTable('social_mentions', {
  id:         text('id').primaryKey(),
  tenantId:   text('tenant_id').notNull().references(() => tenants.id),
  platform:   text('platform').notNull(),
  content:    text('content').notNull(),
  sentiment:  real('sentiment'),
  requiresHumanApproval: boolean('requires_human_approval').notNull().default(true),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt:  timestamp('created_at').defaultNow(),
});

// ── Reddit Threads (HITL hardcoded) ──────────────────────────────────────────
export const redditThreads = pgTable('reddit_threads', {
  id:                   text('id').primaryKey(),
  tenantId:             text('tenant_id').notNull().references(() => tenants.id),
  subreddit:            text('subreddit').notNull(),
  title:                text('title').notNull(),
  draftResponse:        text('draft_response'),
  requiresHumanApproval: boolean('requires_human_approval').notNull().default(true),
  approvedBy:           text('approved_by'),
  approvedAt:           timestamp('approved_at'),
  createdAt:            timestamp('created_at').defaultNow(),
});

// ── A/B Tests ─────────────────────────────────────────────────────────────────
export const abTests = pgTable('ab_tests', {
  id:         text('id').primaryKey(),
  tenantId:   text('tenant_id').notNull().references(() => tenants.id),
  name:       text('name').notNull(),
  variantA:   jsonb('variant_a').$type<{ label: string; lift: number }>().notNull(),
  variantB:   jsonb('variant_b').$type<{ label: string; lift: number }>().notNull(),
  winner:     text('winner'),                              // 'A' | 'B' | 'none'
  winnerLift: real('winner_lift'),
  confidence: real('confidence').notNull().default(0),
  status:     text('status').notNull().default('running'), // 'complete' | 'running' | 'too-early'
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow(),
}, t => ({
  tenantIdx: index('ab_tests_tenant_idx').on(t.tenantId),
}));

// ── Migration SQL ─────────────────────────────────────────────────────────────
export const MIGRATION_SQL = `
-- V16.4 Multicloud Schema (Neon Postgres)
-- DB_TABLES = 19 (orgs, orgMembers, tenants, users, dashboardStates, agentExecutions,
--              webhookEvents, fairnessLogs, hsContacts, payments,
--              contentPages, kbDocuments, socialMentions, redditThreads, abTests
--              + 3 additional: gscKeywords, videoSessions, growthbotSessions)
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for KB embeddings (1536-dim)
` as const;
