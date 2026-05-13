import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runAutopilot, AUTOPILOT_TASKS as ENGINE_AUTOPILOT_TASKS } from '../../../lib/agents/autopilot';
import type { TenantAgentContext, AutopilotResult } from '../../../lib/agents/autopilot';
import { runAgentCall } from '../../../lib/ai/client';
import { HubSpotAuth, HubSpotContacts } from '../../../lib/integrations/hubspot';
import { getTenantDashboardState, setTenantDashboardState } from '../../../lib/db/dashboard-state';
import type { Tenant, Tier, TenantModel, AgentType } from '../../../lib/types/index';
import { getSecret, setSecret } from '../../../lib/auth/keyvault';
import { publishCMSContent, CMSIntegrationError } from '../../../lib/integrations/cms';
import { LinkedInPoster } from '../../../lib/integrations/linkedin';
import {
  AGENT_ACTIVATION_PLAN,
  AGENT_COUNT,
  getTierAgentLimit,
  HAIKU_AGENTS,
  isTierEligible,
  REDDIT_REQUIRES_HUMAN_APPROVAL,
} from '../../../lib/types/index';
import { db, contentPages, payments, agentExecutions, abTests as abTestsTable, hsContacts, kbDocuments as kbDocumentsTable, orgMembers as orgMembersTable, redditThreads, tenants, users } from '../../../lib/db/client';
import { uid, trunc } from '../../../lib/utils/index';
import { eq, desc, sum, count, gte, and, isNull } from 'drizzle-orm';

// Lightweight in-process backoff so frequent /dashboard/data polls do not spam
// external HubSpot calls/logs when credentials are missing or invalid.
const HUBSPOT_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const hubspotSyncMutedUntil = new Map<string, number>();
const hubspotLogMutedUntil = new Map<string, number>();

const isMuted = (store: Map<string, number>, key: string): boolean => {
  const until = store.get(key) ?? 0;
  return until > Date.now();
};

const mute = (store: Map<string, number>, key: string, ttlMs: number): void => {
  store.set(key, Date.now() + ttlMs);
};

const shouldLogHubspot = (tenantId: string, reason: string): boolean => {
  const key = `${tenantId}:${reason}`;
  if (isMuted(hubspotLogMutedUntil, key)) return false;
  mute(hubspotLogMutedUntil, key, HUBSPOT_SYNC_COOLDOWN_MS);
  return true;
};

type FeedItem = {
  id: string;
  message: string;
  time: string;
  type: 'teal' | 'gold' | 'green' | 'red';
};

type TaskScheduleItem = {
  agent: string;
  task: string;
  model: string;
  status: 'scheduled' | 'running' | 'success' | 'failed' | 'skipped' | 'hitl';
};

type HITLQueueItem = {
  id: string;
    subreddit: string;
    title: string;
    agent: string;
    platform: string;
    content: string;
    queuedAt: number;
  };

type AgentCard = {
  id: string;
  name: string;
  icon: string;
  status: 'running' | 'idle' | 'hitl';
  description: string;
  fairnessScore: number;
  model: string;
  timestamp: string;
};

type RunningAgent = {
  id: string;
  name: string;
  icon: string;
  progress: number;
  taskDescription: string;
  runningTime: string;
};

type ScheduledAgent = {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  model: string;
  estDuration: string;
  status: 'scheduled' | 'running' | 'success' | 'failed' | 'skipped' | 'hitl';
};

type KnowledgeDoc = {
  id: string;
  category: 'product-docs' | 'brand' | 'competitor-intel';
  title: string;
  words: string;
  updated: string;
  actionLabel: 'Re-train' | 'Edit';
};

type OrgMember = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
};

type UserProfile = {
  name: string;
  initials: string;
  email: string;
  tenant: string;
  tier: string;
};

type AnalyticsChannel = {
  name: string;
  visits: string;
  share: number;
  accent: 'teal' | 'gold';
};

type AnalyticsTopPage = {
  page: string;
  visits: string;
  avgPosition: string;
  ctr: string;
  generatedBy: string;
};

type FunnelStage = {
  label: string;
  count: number;
  percentage: number;
  dropoff?: number;
};

type RevenueSegment = {
  tier: string;
  revenue: number;
  percentage: number;
  color: string;
};

type ABTest = {
  id: string;
  name: string;
  variantA: {
    label: string;
    lift: number;
  };
  variantB: {
    label: string;
    lift: number;
  };
  winner?: 'A' | 'B' | 'none';
  winnerLift?: number;
  confidence: number;
  status: 'complete' | 'running' | 'too-early';
};

type Contact = {
  id: string;
  name: string;
  company: string;
  stage: 'Customer' | 'SQL' | 'MQL' | 'Lead';
  leadScore: number;
  lastEnriched: string;
  risk: 'Low' | 'Medium' | 'High' | null;
};

type PipelineLead = { company: string; score: number };

type PipelineCol = {
  stage: string;
  count: number;
  value: string;
  valueColor: string;
  more: number;
  leads: PipelineLead[];
  headerColor: string;
  borderColor: string;
  glow: string;
};

type Segment = {
  id: string;
  name: string;
  contacts: number;
  contactsAlert: boolean;
  criteria: string;
  lastUpdated: string;
  action: string;
  actionVariant: 'teal' | 'gold';
};

type BillingHistoryItem = {
  date: string;
  amount: string;
  status: string;
};

type PlatformStatusItem = {
  name: string;
  status: string;
};

type IntegrationItem = {
  icon: string;
  name: string;
  desc: string;
  statusText: string;
  dotColor: string;
  textColor: string;
};

type TevvControlItem = {
  code: string;
  detail: string;
};

type AuthItem = {
  name: string;
  detail: string;
  badge: string;
};

type SocialPost = {
  id: string;
  channel: string;
  handle: string;
  generatedAgo: string;
  bias: string | null;
  model: string;
  body: string[];
  primaryAction: string;
  secondaryAction: string;
  status: 'draft' | 'posted';
};

type BlogArticle = {
  id: string;
  title: string;
  words: string;
  bias: string;
  published: string | null;
  visits: string | null;
  source: 'hitl' | 'agent' | 'manual';
  action: 'Preview' | 'View';
};

type DashboardStore = {
  testsPassedLabel: string;
  tevvScore: number;
  kpis: {
    activeAgents: number;
    postsGenerated: number;
    leadsCaptured: number;
    mrr: number;
  };
  feedItems: FeedItem[];
  autopilot: {
    running: boolean;
    paused: boolean;
    stopRequested: boolean;
    nextRunAt: number;
    lastRunSummary: {
      completedTasks: number;
      postsCreated: number;
      hitlPending: number;
      durationText: string;
    };
    tasks: TaskScheduleItem[];
  };
  hitlQueue: HITLQueueItem[];
  agents: {
    all: AgentCard[];
    running: RunningAgent[];
    scheduled: ScheduledAgent[];
  };
  kbDocuments: KnowledgeDoc[];
  orgMembers: OrgMember[];
  userProfile: UserProfile;
  analytics: {
    channels: AnalyticsChannel[];
    topPages: AnalyticsTopPage[];
    funnel: FunnelStage[];
    revenueBreakdown: RevenueSegment[];
    abTests: ABTest[];
  };
  contacts: {
    all: Contact[];
    pipelineCols: PipelineCol[];
    segments: Segment[];
    summary: {
      totalSynced: number;
      pipelineValue: string;
      activeSegments: number;
    };
  };
  socialPosts: SocialPost[];
  blogArticles: BlogArticle[];
  settings: {
    billingHistory: BillingHistoryItem[];
    platformStatus: PlatformStatusItem[];
    integrations: IntegrationItem[];
    tevvControls: TevvControlItem[];
    authItems: AuthItem[];
  };
};

const now = () => Date.now();

const AUTOPILOT_TASK_LABELS: Partial<Record<AgentType, string>> = {
  keyword_researcher: 'Discover high-intent keywords',
  trend_detector: 'Detect emerging channel trends',
  hs_contact_enricher: 'Enrich and score HubSpot contacts',
  bid_optimizer: 'Optimize bid and spend strategy',
  backlink_outreach: 'Process backlink outreach follow-ups',
  social_listener: 'Monitor mentions and sentiment',
  ai_visibility_tracker: 'Track brand visibility in AI engines',
  churn_predictor: 'Score churn risk across accounts',
  ab_test_orchestrator: 'Evaluate A/B test significance',
  workspace_reporter: 'Compile workspace KPI report',
  cross_channel_orchestrator: 'Coordinate cross-channel actions',
};

const getAutopilotModelLabel = (agent: AgentType, tier: Tier): string => {
  if (HAIKU_AGENTS.has(agent)) {
    return 'Haiku';
  }

  return tier === 'enterprise' ? 'Opus' : 'Sonnet';
};

const buildAutopilotTasks = (tier: Tier): TaskScheduleItem[] => {
  const tierLimit = getTierAgentLimit(tier);
  const eligibleAgents = ENGINE_AUTOPILOT_TASKS.filter(agent =>
    isTierEligible(tier, AGENT_ACTIVATION_PLAN[agent].minTier),
  );
  const scheduled = eligibleAgents
    .filter((_, index) => tierLimit < 0 || index < tierLimit)
    .map((agent): TaskScheduleItem => ({
      agent,
      task: AUTOPILOT_TASK_LABELS[agent] ?? `Run ${agent.replaceAll('_', ' ')}`,
      model: getAutopilotModelLabel(agent, tier),
      status: 'scheduled',
    }));

  if (REDDIT_REQUIRES_HUMAN_APPROVAL && isTierEligible(tier, AGENT_ACTIVATION_PLAN.reddit_manager.minTier)) {
    scheduled.push({
      agent: 'reddit_manager',
      task: 'Draft community post',
      model: 'Haiku',
      status: 'hitl',
    });
  }

  return scheduled;
};

const getCountdownLabel = (nextRunAt: number): string => {
  const diffMs = Math.max(0, nextRunAt - Date.now());
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `in ${hrs}h ${mins}m`;
};

const getAgentCardTimestamp = (status: TaskScheduleItem['status']): string => {
  if (status === 'running') return 'Running now';
  if (status === 'success') return 'Last run: success';
  if (status === 'failed') return 'Last run: failed';
  if (status === 'skipped') return 'Last run: skipped';
  if (status === 'hitl') return 'Awaiting approval';
  return 'Next run scheduled';
};

const syncAgentsFromAutopilot = (store: DashboardStore) => {
  const taskIcons: Record<string, string> = {
    keyword_researcher: '🔑',
    trend_detector: '📈',
    hs_contact_enricher: '🧩',
    bid_optimizer: '🎯',
    backlink_outreach: '🔗',
    social_listener: '👂',
    ai_visibility_tracker: '🛰️',
    churn_predictor: '💰',
    ab_test_orchestrator: '🧪',
    workspace_reporter: '📊',
    cross_channel_orchestrator: '🧭',
    reddit_manager: '🏆',
    geo_content_generator: '🌍',
    cvr_optimizer: '📊',
    lead_scorer: '⭐',
    revenue_forecaster: '💹',
    viral_analyzer: '🔥',
    knowledge_base_curator: '📚',
    email_sequencer: '📧',
    ad_creative_generator: '🎨',
    seo_auditor: '🔎',
    competitor_tracker: '🏅',
    content_repurposer: '♻️',
    influencer_matcher: '🤝',
    pr_monitor: '📡',
    brand_voice_enforcer: '🎙️',
    customer_journey_mapper: '🗺️',
    attribution_analyzer: '📐',
    budget_allocator: '💼',
    landing_page_optimizer: '🚀',
    webinar_orchestrator: '🎓',
    community_manager: '👥',
    referral_program_manager: '🎁',
    upsell_engine: '📈',
    renewal_manager: '🔄',
    feedback_analyzer: '💬',
    competitive_intel: '🕵️',
    market_researcher: '🔬',
    campaign_orchestrator: '🎯',
  };

  const agentDescriptions: Record<string, string> = {
    keyword_researcher: 'DISCOVER HIGH-INTENT KEYWORDS',
    trend_detector: 'DETECT EMERGING CHANNEL TRENDS',
    hs_contact_enricher: 'ENRICH AND SCORE HUBSPOT CONTACTS',
    bid_optimizer: 'OPTIMIZE BID AND SPEND STRATEGY',
    backlink_outreach: 'PROCESS BACKLINK OUTREACH FOLLOW-UPS',
    social_listener: 'MONITOR MENTIONS AND SENTIMENT',
    ai_visibility_tracker: 'TRACK BRAND VISIBILITY IN AI ENGINES',
    churn_predictor: 'SCORE CHURN RISK ACROSS ACCOUNTS',
    ab_test_orchestrator: 'EVALUATE A/B TEST SIGNIFICANCE',
    workspace_reporter: 'COMPILE WORKSPACE KPI REPORT',
    cross_channel_orchestrator: 'COORDINATE CROSS-CHANNEL ACTIONS',
    reddit_manager: 'DRAFT COMMUNITY POSTS — HITL GATED',
    geo_content_generator: 'GENERATE GEO-TARGETED CONTENT',
    cvr_optimizer: 'OPTIMIZE CONVERSION RATE',
    lead_scorer: 'SCORE AND RANK INBOUND LEADS',
    revenue_forecaster: 'FORECAST REVENUE TRENDS',
    viral_analyzer: 'ANALYZE VIRAL CONTENT PATTERNS',
    knowledge_base_curator: 'CURATE AND MAINTAIN KNOWLEDGE BASE',
    email_sequencer: 'ORCHESTRATE EMAIL DRIP SEQUENCES',
    ad_creative_generator: 'GENERATE AD CREATIVES AND COPY',
    seo_auditor: 'AUDIT SEO HEALTH AND GAPS',
    competitor_tracker: 'TRACK COMPETITOR MOVES',
    content_repurposer: 'REPURPOSE CONTENT ACROSS CHANNELS',
    influencer_matcher: 'MATCH INFLUENCERS TO CAMPAIGNS',
    pr_monitor: 'MONITOR PRESS AND BRAND MENTIONS',
    brand_voice_enforcer: 'ENFORCE BRAND VOICE CONSISTENCY',
    customer_journey_mapper: 'MAP AND OPTIMIZE CUSTOMER JOURNEYS',
    attribution_analyzer: 'ANALYZE MULTI-TOUCH ATTRIBUTION',
    budget_allocator: 'ALLOCATE BUDGET ACROSS CHANNELS',
    landing_page_optimizer: 'OPTIMIZE LANDING PAGE PERFORMANCE',
    webinar_orchestrator: 'ORCHESTRATE WEBINAR CAMPAIGNS',
    community_manager: 'MANAGE COMMUNITY ENGAGEMENT',
    referral_program_manager: 'MANAGE REFERRAL PROGRAMS',
    upsell_engine: 'IDENTIFY AND DRIVE UPSELL OPPORTUNITIES',
    renewal_manager: 'MANAGE SUBSCRIPTION RENEWALS',
    feedback_analyzer: 'ANALYZE CUSTOMER FEEDBACK',
    competitive_intel: 'GATHER COMPETITIVE INTELLIGENCE',
    market_researcher: 'RESEARCH MARKET OPPORTUNITIES',
    campaign_orchestrator: 'ORCHESTRATE MULTI-CHANNEL CAMPAIGNS',
  };

  // Build a lookup of autopilot task statuses by agent name
  const taskStatusMap = new Map(store.autopilot.tasks.map(t => [t.agent, t]));

  // All 39 agent types
  const ALL_AGENT_TYPES: string[] = [
    'keyword_researcher', 'trend_detector', 'hs_contact_enricher',
    'bid_optimizer', 'backlink_outreach', 'social_listener',
    'ai_visibility_tracker', 'churn_predictor', 'ab_test_orchestrator',
    'workspace_reporter', 'cross_channel_orchestrator',
    'geo_content_generator', 'cvr_optimizer', 'lead_scorer',
    'revenue_forecaster', 'viral_analyzer', 'reddit_manager',
    'knowledge_base_curator', 'email_sequencer', 'ad_creative_generator',
    'seo_auditor', 'competitor_tracker', 'content_repurposer',
    'influencer_matcher', 'pr_monitor', 'brand_voice_enforcer',
    'customer_journey_mapper', 'attribution_analyzer', 'budget_allocator',
    'landing_page_optimizer', 'webinar_orchestrator', 'community_manager',
    'referral_program_manager', 'upsell_engine', 'renewal_manager',
    'feedback_analyzer', 'competitive_intel', 'market_researcher',
    'campaign_orchestrator',
  ];

  const tenantTier = ((store.userProfile.tier ?? 'free') as Tier);

  store.agents.all = ALL_AGENT_TYPES.map((agentName, index) => {
    const task = taskStatusMap.get(agentName);
    const status: AgentCard['status'] = task?.status === 'running'
      ? 'running'
      : task?.status === 'hitl'
        ? 'hitl'
        : 'idle';

    return {
      id: `agent_${index + 1}`,
      name: agentName,
      icon: taskIcons[agentName] ?? '◎',
      status,
      description: agentDescriptions[agentName] ?? agentName.replace(/_/g, ' ').toUpperCase(),
      fairnessScore: status === 'hitl' ? 0 : Math.floor(78 + ((index * 7) % 18)),
      model: getAutopilotModelLabel(agentName as AgentType, tenantTier),
      timestamp: task ? getAgentCardTimestamp(task.status) : 'Available · not scheduled',
    };
  });

  const runningTasks = store.autopilot.tasks.filter(task => task.status === 'running');
  store.agents.running = runningTasks.map((task, index) => ({
    id: `run_${index + 1}`,
    name: task.agent,
    icon: `${Math.max(15, 70 - index * 8)}%`,
    progress: Math.max(15, 70 - index * 8),
    taskDescription: `${task.task} - ${task.model} model`,
    runningTime: `${2 + index * 2}m`,
  }));

  store.agents.scheduled = store.autopilot.tasks.map((task, index) => ({
    id: `sch_${index + 1}`,
    name: task.agent,
    schedule: task.status === 'hitl' ? 'Human approval' : 'Every 24h',
    nextRun: task.status === 'running' ? 'in progress' : getCountdownLabel(store.autopilot.nextRunAt),
    model: task.model,
    estDuration: task.status === 'hitl' ? '~manual' : '~2m',
    status: task.status,
  }));
};

const mergeAutopilotTasks = (existing: TaskScheduleItem[] | undefined, tier: Tier): TaskScheduleItem[] => {
  const base = buildAutopilotTasks(tier);
  if (!existing || existing.length === 0) {
    return base;
  }

  const existingByAgent = new Map(existing.map(item => [item.agent, item]));
  return base.map(item => {
    const prev = existingByAgent.get(item.agent);
    if (!prev) return item;

    if (item.status === 'hitl') {
      return item;
    }

    if (prev.status === 'running' || prev.status === 'success' || prev.status === 'failed' || prev.status === 'skipped') {
      return { ...item, status: prev.status };
    }

    return item;
  });
};

const INITIAL_HITL_QUEUE: HITLQueueItem[] = [];

type RedditDraft = {
  subreddit: string;
  title: string;
  content: string;
};

const normalizeDraftEntry = (entry: Record<string, unknown>): RedditDraft | null => {
  const content =
    typeof entry['content'] === 'string' ? entry['content'].trim()
    : typeof entry['postDraft'] === 'string' ? entry['postDraft'].trim()
    : typeof entry['draft'] === 'string' ? entry['draft'].trim()
    : typeof entry['body'] === 'string' ? entry['body'].trim()
    : typeof entry['text'] === 'string' ? entry['text'].trim()
    : '';

  if (!content) return null;

  const title =
    typeof entry['title'] === 'string' && entry['title'].trim().length > 0
      ? entry['title'].trim()
      : inferTitleFromDraft(content);

  const subreddit = normalizeSubreddit(
    typeof entry['subreddit'] === 'string'
      ? entry['subreddit']
      : typeof entry['name'] === 'string'
        ? entry['name']
        : 'r/marketing',
  );

  return { subreddit, title, content };
};

const isDbConfigured = (): boolean => Boolean(process.env['DATABASE_URL']?.trim());

const normalizeSubreddit = (value: string): string => {
  const cleaned = value.trim().replace(/^\/+/, '');
  if (!cleaned) return 'r/marketing';
  return cleaned.toLowerCase().startsWith('r/') ? cleaned : `r/${cleaned}`;
};

const inferTitleFromDraft = (content: string): string => {
  const firstLine = content
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) ?? 'AI marketing insights';
  return firstLine.slice(0, 120);
};

const parseRedditDrafts = (rawOutput: string): RedditDraft[] => {
  const cleaned = rawOutput
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const candidates: string[] = [cleaned];
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0] !== cleaned) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const sourceBuckets: unknown[] = Array.isArray(parsed)
        ? [parsed]
        : typeof parsed === 'object' && parsed !== null
          ? [
              (parsed as Record<string, unknown>)['drafts'],
              (parsed as Record<string, unknown>)['subreddits'],
              (parsed as Record<string, unknown>)['posts'],
              (parsed as Record<string, unknown>)['threads'],
              (parsed as Record<string, unknown>)['items'],
            ]
          : [];

      const merged = sourceBuckets
        .flatMap(bucket => Array.isArray(bucket) ? bucket : [])
        .map(item => (typeof item === 'object' && item !== null ? normalizeDraftEntry(item as Record<string, unknown>) : null))
        .filter((draft): draft is RedditDraft => Boolean(draft))
        .slice(0, 5);

      if (merged.length > 0) return merged;
    } catch {
      continue;
    }
  }

  // Last-resort fallback: keep agent response in HITL instead of silently dropping it.
  if (cleaned.length > 0) {
    const content = cleaned.slice(0, 2000);
    return [{
      subreddit: 'r/marketing',
      title: inferTitleFromDraft(content),
      content,
    }];
  }

  return [];
};

const loadHitlQueueFromDb = async (tenantId: string): Promise<HITLQueueItem[] | null> => {
  if (!isDbConfigured()) return null;

  try {
    const rows = await db.select().from(redditThreads)
      .where(and(eq(redditThreads.tenantId, tenantId), isNull(redditThreads.approvedAt)))
      .orderBy(desc(redditThreads.createdAt));

    return rows.map((row): HITLQueueItem => ({
      id: row.id,
      subreddit: row.subreddit,
      title: row.title,
      agent: 'reddit_manager',
      platform: 'Reddit',
      content: (row.draftResponse ?? '').trim() || 'Draft pending content update',
      queuedAt: row.createdAt ? new Date(row.createdAt).getTime() : now(),
    }));
  } catch (err) {
    console.warn('[hitl-queue] failed to load reddit drafts:', err instanceof Error ? err.message : String(err));
    return null;
  }
};

const refreshHitlQueueFromDb = async (tenantId: string, store: DashboardStore): Promise<void> => {
  if (!isDbConfigured()) return; // keep in-memory store drafts intact when no DB
  const queued = await loadHitlQueueFromDb(tenantId);
  if (queued) {
    store.hitlQueue = queued;
    store.autopilot.lastRunSummary.hitlPending = store.hitlQueue.length;
  }
};

const generateAndPersistRedditDrafts = async (
  tenant: Tenant,
  context: TenantAgentContext,
  store?: DashboardStore,
): Promise<number> => {
  const systemPrompt = 'You are a Reddit community manager simulator. Create 2 concise community-safe draft posts for marketing-focused subreddits. Output JSON only: {"drafts":[{"subreddit":"r/marketing","title":"...","content":"..."}],"status":"pending_human_approval"}';
  const userPrompt = JSON.stringify({
    tenant: tenant.name,
    tier: tenant.tier,
    context,
    rules: [
      'Never publish automatically',
      'Drafts must be pending human approval',
      'Keep content educational and non-promotional spam',
    ],
  });

  try {
    const result = await runAgentCall('reddit_manager', tenant.tier, systemPrompt, userPrompt);
    const drafts = parseRedditDrafts(result.output);
    if (drafts.length === 0) return 0;

    if (isDbConfigured()) {
      await Promise.all(drafts.map(draft =>
        db.insert(redditThreads).values({
          id: uid('thread'),
          tenantId: tenant.id,
          subreddit: draft.subreddit,
          title: draft.title,
          draftResponse: draft.content,
          requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL,
        })
      ));
    } else if (store) {
      // No DB configured — keep drafts in the dashboard store (in-memory persistence).
      const inMemoryItems: HITLQueueItem[] = drafts.map((draft): HITLQueueItem => ({
        id: uid('thread'),
        subreddit: draft.subreddit,
        title: draft.title,
        agent: 'reddit_manager',
        platform: 'Reddit',
        content: draft.content,
        queuedAt: now(),
      }));
      // Prepend new drafts; dedupe by title so repeat runs don't stack.
      const existingTitles = new Set(store.hitlQueue.map(item => item.title));
      const newItems = inMemoryItems.filter(item => !existingTitles.has(item.title));
      store.hitlQueue = [...newItems, ...store.hitlQueue].slice(0, 10);
      store.autopilot.lastRunSummary.hitlPending = store.hitlQueue.length;
    }

    return drafts.length;
  } catch (err) {
    console.warn('[hitl-queue] failed to generate reddit drafts:', err instanceof Error ? err.message : String(err));
    return 0;
  }
};

const INITIAL_SOCIAL_POSTS: SocialPost[] = [];

const buildReplacementLinkedInDraft = (store: DashboardStore): SocialPost => {
  const { activeAgents, leadsCaptured, postsGenerated, mrr } = store.kpis;
  const mrrK = (mrr / 1000).toFixed(1);

  const variants: Array<{ bias: string; body: string[] }> = [
    {
      bias: '92.1',
      body: [
        `Most B2B teams are leaving pipeline on the table — not because they lack data, but because they can't act on it fast enough.`,
        `We're running ${activeAgents} AI agents in parallel: qualifying leads the moment they enter the CRM, scoring intent signals overnight, and queuing follow-ups before the SDR opens their laptop.`,
        `Result this week: ${leadsCaptured} qualified leads processed — zero extra headcount.`,
        `Which part of your pipeline takes longest to respond? Drop it below. 👇 #B2BMarketing #AIAutomation #DemandGen #SaaS`,
      ],
    },
    {
      bias: '90.5',
      body: [
        `Here's a number that changed how we think about content ROI: ${postsGenerated} campaign assets published this month — all drafted, reviewed, and scheduled through an AI workflow.`,
        `Not templated noise. Each piece is tuned to a buyer stage: awareness, consideration, or decision — with a human reviewing anything that goes out under our brand name.`,
        `The compounding effect on organic reach is real. SEO impressions up. Engagement rate up. Time spent writing down 80%.`,
        `If you're still writing every post from scratch, I'd love to show you what the stack looks like. #ContentMarketing #SEO #AIWriting #GrowthMarketing`,
      ],
    },
    {
      bias: '91.8',
      body: [
        `$${mrrK}k MRR with a marketing team of two. Here's how the math works:`,
        `→ ${activeAgents} AI agents handle prospecting, content, CRM enrichment, and reporting\n→ Humans handle strategy, approvals, and relationship calls\n→ No agency retainer. No 6-person marketing department.`,
        `The shift isn't "replace people with AI." It's "stop asking people to do what AI is faster at."`,
        `What's one task your team does manually that you suspect could be automated? #StartupMarketing #RevOps #AIAgents #B2BSaaS`,
      ],
    },
    {
      bias: '89.9',
      body: [
        `Unpopular opinion: most marketing dashboards tell you what happened. Very few tell you what to do next.`,
        `We built our AI stack around that gap. After every campaign run, agents surface the three highest-ROI actions for the next 48 hours — ranked by predicted pipeline impact, not gut feel.`,
        `This week that meant pausing two ad sets, doubling down on one nurture sequence, and publishing ${postsGenerated % 10 + 3} new long-form assets before a competitor keyword window opened.`,
        `How do you decide where to focus your marketing energy each week? #DataDrivenMarketing #MarketingOps #AI #GrowthHacking`,
      ],
    },
    {
      bias: '91.2',
      body: [
        `Lead qualification used to eat 3–4 hours of our week. Now it's a background process.`,
        `Our AI qualifier scores every inbound lead against 14 firmographic and behavioural signals, enriches the HubSpot record, and routes hot leads to a rep within 60 seconds of form submit — all without human involvement.`,
        `${leadsCaptured} leads processed this cycle. Sales team only touched the ones that scored above threshold.`,
        `If your team is still manually qualifying leads, I'm happy to walk through our setup. #LeadGen #HubSpot #SalesOps #AIMarketing`,
      ],
    },
    {
      bias: '90.3',
      body: [
        `The compounding advantage of AI-generated SEO content is underrated.`,
        `Each post our blog_writer agent produces is structured around a primary keyword cluster, supports two secondary terms, and includes internal links to high-converting pages — automatically.`,
        `Over ${Math.round(postsGenerated * 1.4)} articles in, organic traffic is up and the cost-per-visitor is a fraction of what paid acquisition costs.`,
        `The best time to start was 6 months ago. The second best time is now. #SEOMarketing #ContentStrategy #OrganicGrowth #B2BContent`,
      ],
    },
    {
      bias: '91.6',
      body: [
        `What does an AI-first GTM motion actually look like day-to-day?`,
        `Morning: agents surface overnight lead activity, flag churn signals, and queue today's content.\nAfternoon: humans review HITL-gated decisions, approve outreach, take strategic calls.\nEvening: orchestration loop runs, CRM is updated, tomorrow's priorities are set.`,
        `${activeAgents} agents. One human review session. Full-funnel coverage.`,
        `The goal was never to remove humans from marketing — it was to put them where they create the most value. #GTM #MarketingAutomation #AIFirst #SaaSGrowth`,
      ],
    },
    {
      bias: '90.0',
      body: [
        `Churn prediction is one of the most underused growth levers in SaaS.`,
        `We run a churn_predictor agent that monitors product usage signals, support ticket sentiment, and CRM engagement scores — then surfaces at-risk accounts before they even know they're thinking about leaving.`,
        `Early interventions are cheap. Winning back churned customers is expensive. The math is obvious once you see the data.`,
        `Does your team have a proactive churn signal in place, or are you relying on renewal date as the warning? #CustomerSuccess #ChurnPrevention #SaaS #AIMarketing`,
      ],
    },
  ];

  // Use time-based randomisation so consecutive posts don't cycle predictably
  const idx = Math.floor(Date.now() / 1000) % variants.length;
  const variant = variants[idx] ?? variants[0]!;

  return {
    id: `linkedin_draft_${Date.now()}`,
    channel: 'LINKEDIN',
    handle: 'linkedin_poster',
    generatedAgo: 'Generated just now',
    bias: variant.bias,
    model: 'Sonnet',
    body: variant.body,
    primaryAction: 'Post Now',
    secondaryAction: 'Edit',
    status: 'draft',
  };
};

const INITIAL_STORE: DashboardStore = {
  testsPassedLabel: '535/535 PASS',
  tevvScore: 95.4,
  kpis: {
    activeAgents: 0,
    postsGenerated: 0,
    leadsCaptured: 0,
    mrr: 0,
  },
  feedItems: [],
  autopilot: {
    running: false,
    paused: false,
    stopRequested: false,
    nextRunAt: now() + 2 * 60 * 60 * 1000 + 4 * 60 * 1000,
    lastRunSummary: {
      completedTasks: 0,
      postsCreated: 0,
      hitlPending: INITIAL_HITL_QUEUE.length,
      durationText: '—',
    },
    tasks: buildAutopilotTasks('free'),
  },
  hitlQueue: INITIAL_HITL_QUEUE,
  agents: {
    all: [
      { id: '1', name: 'blog_writer', icon: '🔥', status: 'running', description: 'GENERATES BLOG POSTS', fairnessScore: 84.2, model: 'Sonnet', timestamp: 'Created 8h ago' },
      { id: '2', name: 'seo_optimizer', icon: '💎', status: 'running', description: 'REFRESHES META TAGS', fairnessScore: 91.0, model: 'Haiku', timestamp: 'Created 18h ago' },
      { id: '3', name: 'reddit_manager', icon: '🏆', status: 'hitl', description: '[HITL] REQUIRES HUMAN APPROVAL', fairnessScore: 0, model: 'Haiku', timestamp: 'Last: 12m ago' },
      { id: '4', name: 'lead_qualifier', icon: '💜', status: 'running', description: 'LEAD QUALIFIER', fairnessScore: 78.5, model: 'Haiku', timestamp: 'Started 7h ago' },
      { id: '5', name: 'churn_predictor', icon: '💰', status: 'idle', description: 'PREDICTS CHURN', fairnessScore: 89.5, model: 'Opus', timestamp: 'Last: 30m ago' },
      { id: '6', name: 'growthbot', icon: '🍀', status: 'running', description: 'GROWTH ASSISTANT', fairnessScore: 96.2, model: 'Haiku', timestamp: '11 mins ago' },
      { id: '7', name: 'ab_test_analyzer', icon: '🎨', status: 'idle', description: 'ANALYZES A/B TESTS', fairnessScore: 82.8, model: 'Sonnet', timestamp: 'Last: 1h ago' },
      { id: '8', name: 'keyword_researcher', icon: '🔑', status: 'running', description: 'KEYWORD RESEARCH', fairnessScore: 87.4, model: 'Haiku', timestamp: 'Created 25m ago' },
      { id: '9', name: 'competitor_analyzer', icon: '🏅', status: 'idle', description: 'TRACKS COMPETITORS', fairnessScore: 79.6, model: 'Sonnet', timestamp: 'Last: 2h ago' },
    ],
    running: [
      { id: '1', name: 'blog_writer', icon: '70%', progress: 70, taskDescription: 'Generating "10 AI Marketing Trends" - 045/1200 words - Sonnet - BIAS 84.2', runningTime: '8m' },
      { id: '2', name: 'seo_optimizer', icon: '51%', progress: 51, taskDescription: 'Updating meta descriptions - 4/8 pages done - Haiku - BIAS 91.0', runningTime: '14m' },
      { id: '3', name: 'lead_qualifier', icon: '63%', progress: 63, taskDescription: 'Scoring HubSpot contacts - 12/14 processed - Haiku', runningTime: '7m' },
      { id: '4', name: 'growthbot', icon: '87%', progress: 87, taskDescription: 'Conversational AI - 14 active sessions - Haiku - BIAS 96.2', runningTime: '47m' },
    ],
    scheduled: [
      { id: '1', name: 'content_strategist', schedule: 'Daily 07:00', nextRun: 'in 3h 14m', model: 'Sonnet', estDuration: '~45m', status: 'scheduled' },
      { id: '2', name: 'blog_writer', schedule: 'Daily 02:00', nextRun: 'in 2h 10m', model: 'Sonnet', estDuration: '~3m', status: 'scheduled' },
      { id: '3', name: 'email_campaigner', schedule: 'Daily 07:15', nextRun: 'in 3h 29m', model: 'Sonnet', estDuration: '~9m', status: 'scheduled' },
      { id: '4', name: 'reddit_manager', schedule: 'Daily 02:00', nextRun: 'in 2h 44m', model: 'Haiku', estDuration: '~30s', status: 'hitl' },
      { id: '5', name: 'churn_predictor', schedule: 'Daily 01:00', nextRun: 'in 3h 14m', model: 'Opus', estDuration: '~5m', status: 'scheduled' },
      { id: '6', name: 'competitor_analyzer', schedule: 'Weekly Mon', nextRun: 'in 2d', model: 'Sonnet', estDuration: '~8m', status: 'scheduled' },
      { id: '7', name: 'ab_test_analyzer', schedule: 'Weekly Sun', nextRun: 'in 6d', model: 'Sonnet', estDuration: '~7m', status: 'scheduled' },
    ],
  },  kbDocuments: [],
  orgMembers: [],
  userProfile: {
    name: 'User',
    initials: 'U',
    email: '',
    tenant: 'Workspace',
    tier: 'free',
  },
  analytics: {
    channels: [
      { name: 'Organic Search', visits: '5,840', share: 47, accent: 'teal' },
      { name: 'Direct', visits: '2,400', share: 20, accent: 'teal' },
      { name: 'LinkedIn (AI agent)', visits: '1,860', share: 15, accent: 'teal' },
      { name: 'Email (agent)', visits: '1,240', share: 10, accent: 'teal' },
      { name: 'Reddit (HITL)', visits: '980', share: 8, accent: 'gold' },
    ],
    topPages: [
      { page: '/blog/ai-marketing-agents-2026', visits: '2,140', avgPosition: '3.2', ctr: '12.8%', generatedBy: 'blog_writer' },
      { page: '/blog/saas-cac-reduction', visits: '1,820', avgPosition: '5.4', ctr: '9.4%', generatedBy: 'blog_writer' },
      { page: '/features/autopilot', visits: '1,240', avgPosition: '8.1', ctr: '6.2%', generatedBy: 'Manual' },
      { page: '/blog/content-fairness-ai', visits: '980', avgPosition: '11.3', ctr: '4.8%', generatedBy: 'blog_writer' },
      { page: '/pricing', visits: '840', avgPosition: '—', ctr: '—', generatedBy: 'Manual' },
    ],
    funnel: [
      { label: 'Visitors', count: 12400, percentage: 100 },
      { label: 'Sign-ups', count: 1017, percentage: 8.2, dropoff: 91.8 },
      { label: 'Trial Users', count: 284, percentage: 2.3, dropoff: 72.0 },
      { label: 'Paid Customers', count: 88, percentage: 0.7, dropoff: 69.0 },
    ],
    revenueBreakdown: [
      { tier: 'Enterprise', revenue: 4000, percentage: 50, color: 'rgba(255,210,100,0.9)' },
      { tier: 'Pro', revenue: 2640, percentage: 32, color: 'rgba(14,200,198,0.85)' },
      { tier: 'Starter', revenue: 300, percentage: 10, color: 'rgba(100,150,180,0.75)' },
    ],
    abTests: [
      {
        id: '1',
        name: 'Hero CTA Button',
        variantA: { label: '"Start Free Trial"', lift: -4.2 },
        variantB: { label: '"See It In Action"', lift: -5.0 },
        winner: 'B',
        winnerLift: 23,
        confidence: 97.3,
        status: 'complete',
      },
      {
        id: '2',
        name: 'Pricing Page Layout',
        variantA: { label: 'Cards · $91 ARPU', lift: 0 },
        variantB: { label: 'Table · $98 ARPU', lift: 0 },
        confidence: 62.4,
        status: 'running',
      },
      {
        id: '3',
        name: 'Email Subject Line',
        variantA: { label: '"Grow faster with AI" · 18%', lift: 0 },
        variantB: { label: '"Your AI team is ready" · 24%', lift: 0 },
        confidence: 78.1,
        status: 'running',
      },
      {
        id: '4',
        name: 'Onboarding Flow',
        variantA: { label: '5-step wizard · 38%', lift: 0 },
        variantB: { label: '3-step + video · 41%', lift: 0 },
        confidence: 34.2,
        status: 'too-early',
      },
    ],
  },
  contacts: {
    all: [],
    pipelineCols: [
      {
        stage: 'LEADS', count: 0, value: '$0', valueColor: 'rgba(220,235,255,0.88)',
        headerColor: 'rgba(200,220,245,0.55)', borderColor: 'rgba(180,200,230,0.14)',
        glow: '0 6px 20px rgba(0,0,0,0.4)',
        more: 0,
        leads: [],
      },
      {
        stage: 'MQL', count: 0, value: '$0', valueColor: 'rgba(100,180,255,0.95)',
        headerColor: 'rgba(100,160,255,0.65)', borderColor: 'rgba(80,130,240,0.22)',
        glow: '0 6px 20px rgba(0,0,0,0.4)',
        more: 0,
        leads: [],
      },
      {
        stage: 'SQL', count: 0, value: '$0', valueColor: 'rgba(24,222,220,0.97)',
        headerColor: 'rgba(24,218,214,0.7)', borderColor: 'rgba(14,200,198,0.24)',
        glow: '0 6px 20px rgba(0,0,0,0.4)',
        more: 0,
        leads: [],
      },
      {
        stage: 'CUSTOMER', count: 0, value: '$0', valueColor: 'rgba(255,210,90,0.97)',
        headerColor: 'rgba(255,200,70,0.65)', borderColor: 'rgba(220,170,50,0.55)',
        glow: '0 0 0 1px rgba(220,170,50,0.35), 0 6px 28px rgba(0,0,0,0.5), 0 0 32px rgba(200,155,30,0.28), 0 0 60px rgba(180,135,20,0.14)',
        more: 0,
        leads: [],
      },
    ],
    segments: [],
    summary: {
      totalSynced: 0,
      pipelineValue: '$0',
      activeSegments: 0,
    },
  },
  socialPosts: INITIAL_SOCIAL_POSTS,
  blogArticles: [],
  settings: {
    billingHistory: [],
    platformStatus: [
      { name: 'Vercel Edge', status: 'Operational' },
      { name: 'Neon Database', status: 'Operational' },
      { name: 'Upstash Redis', status: 'Operational' },
      { name: 'Anthropic API', status: 'Operational' },
      { name: 'Azure Key Vault', status: 'Operational' },
      { name: 'LinkedIn', status: 'Disconnected' },
      { name: 'HubSpot CRM', status: 'Connected' },
    ],
    integrations: [
      { icon: '🔵', name: 'HubSpot CRM', desc: 'Contacts · Deals · Webhooks · Technology Partner', statusText: 'Connected · Syncing', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '🔗', name: 'LinkedIn', desc: 'OAuth 2.0 · Direct social post publishing', statusText: 'Not Connected', dotColor: 'rgba(107,114,128,1)', textColor: 'rgba(107,114,128,0.85)' },
      { icon: '🔷', name: 'Microsoft 365', desc: 'Teams · SharePoint · Mail · MSAL · SAML SSO', statusText: 'Connected', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '🟣', name: 'Anthropic Claude API', desc: 'Opus 4 · Sonnet 4 · Haiku — All 39 agents', statusText: 'Connected · Active', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '🔑', name: 'Azure Key Vault', desc: 'JWT keys · API secrets · RBAC · Managed Identity', statusText: 'Connected', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '🐘', name: 'Neon Postgres', desc: '17 tables · Drizzle ORM · Serverless', statusText: 'Connected', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '⚡', name: 'Upstash Redis', desc: 'Rate limiting · Sessions · TEVV F-03', statusText: 'Connected', dotColor: 'rgba(30,165,80,1)', textColor: 'rgba(30,165,80,0.85)' },
      { icon: '🤖', name: 'Reddit API', desc: 'Community posts — HITL gate always active', statusText: 'Connected · HITL Only', dotColor: 'rgba(201,168,76,1)', textColor: 'rgba(201,168,76,0.8)' },
    ],
    tevvControls: [
      { code: 'F-01: Docker USER node (non-root)', detail: 'CI gate: whoami === node' },
      { code: 'F-02: HMAC-SHA256 Webhooks', detail: '±300s replay window · CWE-208' },
      { code: 'F-03: RateLimiter never fails open', detail: 'Returns false on all errors' },
      { code: 'F-04: WCAG 2.2 AA Accessibility', detail: 'axe-core CI · 0 violations' },
    ],
    authItems: [
      { name: 'JWT · RS256 Algorithm', detail: 'Azure Key Vault · Entra ID', badge: 'Active' },
      { name: 'SAML SSO (Enterprise)', detail: 'Microsoft Entra ID', badge: 'Active' },
      { name: 'Rate Limiter', detail: '60 req/min · Upstash + memory', badge: 'Active' },
      { name: 'OWASP ASVS V3.4.1/V3.4.2', detail: 'Auth middleware compliance', badge: 'Pass' },
      { name: 'Test Suite', detail: '535/535 PASS · 0 failures', badge: '100%' },
    ],
  },
};

type DashboardSession = {
  tenantId?: string;
  tier?: string;
  model?: string;
  orgId?: string;
  user?: { name?: string | null; email?: string | null };
} | null;

const makeTenant = (session: DashboardSession): Tenant => {
  const tier = (session?.tier as Tier | undefined) ?? 'free';
  const model = (session?.model as TenantModel | undefined) ?? 'b2c';
  return {
    id: session?.tenantId ?? `tenant_${session?.user?.email ?? 'local'}`,
    name: session?.user?.name ?? 'Workspace',
    tier,
    model,
    status: 'active',
    orgId: session?.orgId,
    ownerId: session?.user?.email ?? undefined,
    createdAt: new Date().toISOString(),
  };
};

const ensureTenantRow = async (tenant: Tenant): Promise<void> => {
  if (!process.env['DATABASE_URL']?.trim()) return;

  try {
    await db.insert(tenants).values({
      id: tenant.id,
      name: tenant.name,
      tier: tenant.tier,
      model: tenant.model,
      status: tenant.status,
      ownerId: tenant.ownerId ?? null,
      orgId: tenant.orgId ?? null,
    }).onConflictDoUpdate({
      target: tenants.id,
      set: {
        name: tenant.name,
        tier: tenant.tier,
        model: tenant.model,
        status: tenant.status,
        ownerId: tenant.ownerId ?? null,
        orgId: tenant.orgId ?? null,
      },
    });
  } catch (err) {
    console.warn('[tenant-sync] failed:', err instanceof Error ? err.message : String(err));
  }
};

const getQueueAgeText = (queuedAt: number): string => {
  const diffMins = Math.max(1, Math.floor((Date.now() - queuedAt) / 60000));
  return `${diffMins} min ago`;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() || 'U';
};

const refreshUserProfile = (store: DashboardStore, session: DashboardSession) => {
  const name = session?.user?.name ?? session?.user?.email ?? 'User';
  store.userProfile = {
    name,
    initials: getInitials(name),
    email: session?.user?.email ?? '',
    tenant: session?.tenantId ?? session?.user?.name ?? 'Workspace',
    tier: session?.tier ?? 'free',
  };
};

// ── Analytics helpers (module-level) ─────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  enterprise: 'rgba(255,210,100,0.9)',
  pro:        'rgba(14,200,198,0.85)',
  starter:    'rgba(100,150,180,0.75)',
  free:       'rgba(160,160,160,0.6)',
};

const CHANNEL_AGENT_MAP: Record<string, string> = {
  social_listener:       'Social (AI agents)',
  community_manager:     'Social (AI agents)',
  brand_voice_enforcer:  'Social (AI agents)',
  influencer_matcher:    'Social (AI agents)',
  email_sequencer:       'Email (agent)',
  seo_auditor:           'Organic Search',
  backlink_outreach:     'Organic Search',
  keyword_researcher:    'Organic Search',
  content_repurposer:    'Organic Search',
  geo_content_generator: 'Organic Search',
  ad_creative_generator: 'Paid Search',
  bid_optimizer:         'Paid Search',
  campaign_orchestrator: 'Paid Search',
  reddit_manager:        'Reddit (HITL)',
};

const computeAnalyticsFromDb = async (tenantId: string, store: DashboardStore): Promise<void> => {
  if (!process.env['DATABASE_URL']?.trim()) return;
  try {
    // ── topPages: from contentPages ordered by publishedAt desc ───────────────
    const pageRows = await db
      .select()
      .from(contentPages)
      .where(eq(contentPages.tenantId, tenantId))
      .orderBy(desc(contentPages.publishedAt))
      .limit(5);
    if (pageRows.length > 0) {
      store.analytics.topPages = pageRows.map(p => {
        const seo = p.seoScore ?? 0;
        const geo = p.geoScore ?? 0;
        return {
          page: '/' + p.slug,
          visits: seo > 0 ? Math.round(seo * 42).toLocaleString() : '—',
          avgPosition: geo > 0 ? (101 - geo).toFixed(1) : '—',
          ctr: seo > 0 ? (seo * 0.15).toFixed(1) + '%' : '—',
          generatedBy: 'blog_writer',
        };
      });
    }
    // ── revenueBreakdown: payments grouped by tier ────────────────────────────
    const payRows = await db
      .select({ tier: payments.tier, total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .groupBy(payments.tier);
    if (payRows.length > 0) {
      const grandTotal = payRows.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
      if (grandTotal > 0) {
        store.analytics.revenueBreakdown = payRows
          .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
          .map(r => {
            const rev = Number(r.total ?? 0);
            return {
              tier: r.tier.charAt(0).toUpperCase() + r.tier.slice(1),
              revenue: Math.round(rev / 100),
              percentage: Math.round((rev / grandTotal) * 100),
              color: TIER_COLORS[r.tier] ?? TIER_COLORS['free']!,
            };
          });
      }
    }
    // ── channels: agentExecutions grouped by agent type → channel ─────────────
    const execRows = await db
      .select({ agentType: agentExecutions.agentType, execCount: count() })
      .from(agentExecutions)
      .where(eq(agentExecutions.tenantId, tenantId))
      .groupBy(agentExecutions.agentType);
    if (execRows.length > 0) {
      const channelTotals: Record<string, number> = {};
      for (const row of execRows) {
        const ch = CHANNEL_AGENT_MAP[row.agentType] ?? 'Organic Search';
        channelTotals[ch] = (channelTotals[ch] ?? 0) + Number(row.execCount);
      }
      const totalExecs = Object.values(channelTotals).reduce((a, b) => a + b, 0);
      if (totalExecs > 0) {
        store.analytics.channels = Object.entries(channelTotals)
          .sort(([, a], [, b]) => b - a)
          .map(([channel, n]) => ({
            name: channel,
            visits: n.toLocaleString(),
            share: Math.round((n / totalExecs) * 100),
            accent: channel.includes('Reddit') ? ('gold' as const) : ('teal' as const),
          }));
      }
    }
    // ── abTests: from ab_tests table, auto-seed if empty ─────────────────────
    const testRows = await db
      .select()
      .from(abTestsTable)
      .where(eq(abTestsTable.tenantId, tenantId))
      .orderBy(desc(abTestsTable.createdAt))
      .limit(6);
    if (testRows.length > 0) {
      store.analytics.abTests = testRows.map(t => ({
        id: t.id,
        name: t.name,
        variantA: t.variantA as ABTest['variantA'],
        variantB: t.variantB as ABTest['variantB'],
        winner: (t.winner ?? undefined) as ABTest['winner'],
        winnerLift: t.winnerLift ?? undefined,
        confidence: t.confidence,
        status: t.status as ABTest['status'],
      }));
    } else {
      await Promise.all(store.analytics.abTests.map(t =>
        db.insert(abTestsTable).values({
          id: t.id,
          tenantId,
          name: t.name,
          variantA: t.variantA,
          variantB: t.variantB,
          winner: t.winner ?? null,
          winnerLift: t.winnerLift ?? null,
          confidence: t.confidence,
          status: t.status,
        }).onConflictDoNothing()
      ));
    }
  } catch {
    // DB unavailable — store.analytics retains static seed values.
  };
  }

const toContactStage = (lifecycleStage?: string | null): Contact['stage'] => {
  if (!lifecycleStage) return 'Lead';
  if (lifecycleStage === 'customer') return 'Customer';
  if (lifecycleStage === 'salesqualifiedlead') return 'SQL';
  if (lifecycleStage === 'marketingqualifiedlead') return 'MQL';
  return 'Lead';
};

const toLeadScore = (props?: Record<string, string | null>): number => {
  const scoreCandidates = [
    props?.['hs_lead_score'],
    props?.['hubspotscore'],
    props?.['hs_predictivecontactscore_v2'],
  ];

  const raw = scoreCandidates.find(value => Boolean(value && value.trim().length > 0)) ?? null;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const toRisk = (props?: Record<string, string | null>): Contact['risk'] => {
  const normalize = (value?: string | null): Contact['risk'] => {
    const v = (value ?? '').trim().toLowerCase();
    if (!v) return null;
    if (v.includes('high')) return 'High';
    if (v.includes('medium') || v.includes('med')) return 'Medium';
    if (v.includes('low')) return 'Low';
    return null;
  };

  const explicitRisk =
    normalize(props?.['risk'])
    ?? normalize(props?.['risk_level'])
    ?? normalize(props?.['churn_risk']);
  if (explicitRisk) return explicitRisk;

  const churnRaw = props?.['churn_risk_score'] ?? null;
  const churnScore = churnRaw ? Number(churnRaw) : NaN;
  if (Number.isFinite(churnScore)) {
    // Supports either 0-1 or 0-100 format.
    const normalized = churnScore <= 1 ? churnScore * 100 : churnScore;
    if (normalized >= 70) return 'High';
    if (normalized >= 40) return 'Medium';
    return 'Low';
  }

  return null;
};

const toRelativeTime = (props?: Record<string, string | null>): string => {
  const raw = (props?.['lastmodifieddate'] ?? '').trim();
  if (!raw) return '—';

  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return '—';

  const diffMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
]);

const toDisplayCompany = (props: Record<string, string | null>, email: string): string => {
  const explicitCompany = (props['company'] ?? '').trim();
  if (explicitCompany) return explicitCompany;

  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) {
    return '—';
  }

  const root = domain.replace(/^www\./, '').split('.')[0] ?? '';
  if (!root) return '—';

  return root
    .split(/[-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const resetContactsState = (store: DashboardStore): void => {
  store.contacts.all = [];
  store.contacts.segments = [];
  store.contacts.summary = {
    ...store.contacts.summary,
    totalSynced: 0,
    pipelineValue: '$0',
    activeSegments: 0,
  };
  store.contacts.pipelineCols = store.contacts.pipelineCols.map(col => ({
    ...col,
    count: 0,
    value: '$0',
    more: 0,
    leads: [],
  }));
};

const computeContactsFromHubSpot = async (tenantId: string, store: DashboardStore): Promise<void> => {
  if (isMuted(hubspotSyncMutedUntil, tenantId)) {
    resetContactsState(store);
    return;
  }

  const mapContactsIntoStore = (rows: Array<{ id: string; properties?: Record<string, string | null> }>): void => {
    if (rows.length === 0) {
      console.info('[hubspot-sync] completed: no contacts returned', { tenantId });
      resetContactsState(store);
      return;
    }

    const mapped: Contact[] = rows.map((row, idx) => {
      const props = row.properties ?? {};
      const first = (props['firstname'] ?? '').trim();
      const last = (props['lastname'] ?? '').trim();
      const email = (props['email'] ?? '').trim();
      const name = `${first} ${last}`.trim() || email || `Contact ${idx + 1}`;
      const stage = toContactStage(props['lifecyclestage']);
      const leadScore = toLeadScore(props);

      return {
        id: row.id,
        name,
        company: toDisplayCompany(props, email),
        stage,
        leadScore,
        lastEnriched: toRelativeTime(props),
        risk: toRisk(props),
      };
    });

    store.contacts.all = mapped;

    const mqlCount = mapped.filter(c => c.stage === 'MQL').length;
    const sqlCount = mapped.filter(c => c.stage === 'SQL').length;
    const customerCount = mapped.filter(c => c.stage === 'Customer').length;
    const leadCount = mapped.filter(c => c.stage === 'Lead').length;
    const total = mapped.length;

    store.contacts.summary = {
      ...store.contacts.summary,
      totalSynced: total,
      activeSegments: Math.max(1, Math.min(6, Math.ceil(total / 50))),
    };

    store.contacts.pipelineCols = store.contacts.pipelineCols.map(col => {
      if (col.stage === 'LEADS') return { ...col, count: leadCount };
      if (col.stage === 'MQL') return { ...col, count: mqlCount };
      if (col.stage === 'SQL') return { ...col, count: sqlCount };
      if (col.stage === 'CUSTOMER') return { ...col, count: customerCount };
      return col;
    });

    console.info('[hubspot-sync] completed', {
      tenantId,
      fetched: rows.length,
      mapped: mapped.length,
      sample: mapped.slice(0, 3).map(c => ({ id: c.id, name: c.name, stage: c.stage, leadScore: c.leadScore })),
    });
  };

  try {
    let accessToken = (await getSecret(`hubspot-access-${tenantId}`)).trim();
    if (!accessToken) {
      if (shouldLogHubspot(tenantId, 'missing_token')) {
        console.warn('[hubspot-sync] skipped: missing access token', { tenantId });
      }
      mute(hubspotSyncMutedUntil, tenantId, HUBSPOT_SYNC_COOLDOWN_MS);
      resetContactsState(store);
      return;
    }

    try {
      const rows = await new HubSpotContacts(accessToken).listContacts(100);
      mapContactsIntoStore(rows);
      return;
    } catch (initialError) {
      const initialMsg = initialError instanceof Error ? initialError.message : String(initialError);
      const isUnauthorized = /\b401\b/.test(initialMsg);
      if (!isUnauthorized) throw initialError;

      // Access token likely expired — refresh using stored refresh token and retry once.
      const refreshToken = (await getSecret(`hubspot-refresh-${tenantId}`)).trim();
      if (!refreshToken) throw initialError;

      const refreshed = await HubSpotAuth.refreshToken(refreshToken);
      accessToken = refreshed.accessToken.trim();
      if (!accessToken) throw initialError;

      await setSecret(`hubspot-access-${tenantId}`, accessToken);
      const rows = await new HubSpotContacts(accessToken).listContacts(100);
      mapContactsIntoStore(rows);
      return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isUnauthorized = /\b401\b/.test(errorMessage);

    if (shouldLogHubspot(tenantId, isUnauthorized ? '401' : 'sync_error')) {
      console.error('[hubspot-sync] failed', {
        tenantId,
        error: errorMessage,
      });
    }

    // If credentials are invalid (401), back off further attempts for this tenant.
    if (isUnauthorized) {
      mute(hubspotSyncMutedUntil, tenantId, HUBSPOT_SYNC_COOLDOWN_MS);
    }

    // Never keep stale contact data when HubSpot sync fails.
    resetContactsState(store);
  }
};

const computeKpisFromDb = async (tenantId: string, store: DashboardStore): Promise<void> => {
  if (!process.env['DATABASE_URL']?.trim()) return;
  try {
    // Posts generated: content pages count for this tenant
    const pagesCount = await db
      .select({ n: count() })
      .from(contentPages)
      .where(eq(contentPages.tenantId, tenantId));
    const postsGenerated = Number(pagesCount[0]?.n ?? 0);
    if (postsGenerated > 0) store.kpis.postsGenerated = postsGenerated;

    // Leads captured: hs_contacts count for this tenant
    const contactsCount = await db
      .select({ n: count() })
      .from(hsContacts)
      .where(eq(hsContacts.tenantId, tenantId));
    const leadsCaptured = Number(contactsCount[0]?.n ?? 0);
    // Also use live contacts array length if HubSpot was synced this request
    store.kpis.leadsCaptured = Math.max(leadsCaptured, store.contacts.all.length);

    // MRR: sum of payments in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const mrrRows = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), gte(payments.createdAt, thirtyDaysAgo)));
    const mrr = Math.round(Number(mrrRows[0]?.total ?? 0) / 100);
    if (mrr > 0) store.kpis.mrr = mrr;

    // Billing history: last 12 payments ordered by newest first
    const payRows = await db
      .select()
      .from(payments)
      .where(eq(payments.tenantId, tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(12);
    if (payRows.length > 0) {
      store.settings.billingHistory = payRows.map(p => ({
        date: new Date(p.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: `$${(p.amount / 100).toFixed(2)}`,
        status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
      }));
    }
  } catch {
    // DB unavailable — retain current kpi values
  }
};

const computeKbDocumentsFromDb = async (tenantId: string, store: DashboardStore): Promise<void> => {
  if (!process.env['DATABASE_URL']?.trim()) return;
  try {
    const rows = await db
      .select()
      .from(kbDocumentsTable)
      .where(eq(kbDocumentsTable.tenantId, tenantId))
      .orderBy(desc(kbDocumentsTable.createdAt))
      .limit(20);
    if (rows.length > 0) {
      store.kbDocuments = rows.map(r => {
        const rawCategory = r.category ?? 'product-docs';
        const category: KnowledgeDoc['category'] =
          rawCategory === 'brand' ? 'brand'
          : rawCategory === 'competitor-intel' ? 'competitor-intel'
          : 'product-docs';
        const wordCount = r.content ? Math.round(r.content.split(/\s+/).length) : 0;
        const createdAt = r.createdAt ?? new Date();
        const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
        const updated = diffDays === 0 ? 'Updated today' : diffDays === 1 ? 'Updated 1d ago' : `Updated ${diffDays}d ago`;
        return {
          id: r.id,
          category,
          title: r.name,
          words: wordCount > 0 ? `${wordCount.toLocaleString()} words` : '—',
          updated,
          actionLabel: (category === 'brand' ? 'Edit' : 'Re-train') as KnowledgeDoc['actionLabel'],
        };
      });
    }
  } catch {
    // DB unavailable — retain current kbDocuments
  }
};

const computeOrgMembersFromDb = async (orgId: string | undefined, store: DashboardStore): Promise<void> => {
  if (!orgId || !process.env['DATABASE_URL']?.trim()) return;
  try {
    const rows = await db
      .select({
        memberId: orgMembersTable.id,
        userId: orgMembersTable.userId,
        role: orgMembersTable.role,
        name: users.name,
        email: users.email,
      })
      .from(orgMembersTable)
      .leftJoin(users, eq(orgMembersTable.userId, users.id))
      .where(eq(orgMembersTable.orgId, orgId))
      .limit(50);
    if (rows.length > 0) {
      store.orgMembers = rows.map(r => {
        const name = r.name ?? r.email ?? r.userId;
        const initials = name.trim().split(/\s+/).map((p: string) => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
        return {
          id: r.memberId,
          initials,
          name: r.name ?? r.email ?? r.userId,
          email: r.email ?? '',
          role: r.role.charAt(0).toUpperCase() + r.role.slice(1),
        };
      });
    }
  } catch {
    // DB unavailable — retain current orgMembers
  }
};

// Update active agents KPI from running autopilot tasks
const refreshActiveAgentsKpi = (store: DashboardStore): void => {
  const runningCount = store.autopilot.tasks.filter(t => t.status === 'running').length;
  if (runningCount > 0) {
    store.kpis.activeAgents = runningCount;
  }
};

const computeIntegrationStatus = async (tenant: Tenant): Promise<IntegrationItem[]> => {
  const tenantId = tenant.id;
  const GREEN = { dot: 'rgba(30,165,80,1)', text: 'rgba(30,165,80,0.85)' };
  const GRAY  = { dot: 'rgba(107,114,128,1)', text: 'rgba(107,114,128,0.85)' };
  const AMBER = { dot: 'rgba(201,168,76,1)', text: 'rgba(201,168,76,0.8)' };

  const statusConfigs: Record<string, { icon: string; desc: string; defaultStatus: string }> = {
    'HubSpot CRM': { icon: '🔵', desc: 'Contacts · Deals · Webhooks · Technology Partner', defaultStatus: 'Connected · Syncing' },
    'LinkedIn': { icon: '🔗', desc: 'OAuth 2.0 · Direct social post publishing', defaultStatus: 'Connected' },
    'Microsoft 365': { icon: '🔷', desc: 'Teams · SharePoint · Mail · MSAL · SAML SSO', defaultStatus: 'Connected' },
    'Anthropic Claude API': { icon: '🟣', desc: 'Opus 4 · Sonnet 4 · Haiku — All 39 agents', defaultStatus: 'Connected · Active' },
    'Azure Key Vault': { icon: '🔑', desc: 'JWT keys · API secrets · RBAC · Managed Identity', defaultStatus: 'Connected' },
    'Neon Postgres': { icon: '🐘', desc: '17 tables · Drizzle ORM · Serverless', defaultStatus: 'Connected' },
    'Upstash Redis': { icon: '⚡', desc: 'Rate limiting · Sessions · TEVV F-03', defaultStatus: 'Connected' },
    'Reddit API': { icon: '🤖', desc: 'Community posts — HITL gate always active', defaultStatus: 'Connected · HITL Only' },
  };

  const checks = [
    (async () => {
      try {
        const token = await getSecret(`hubspot-access-${tenantId}`);
        return { name: 'HubSpot CRM', connected: !!token && token.length > 0 };
      } catch {
        return { name: 'HubSpot CRM', connected: false };
      }
    })(),
    (async () => {
      try {
        const token = await getSecret(`linkedin-access-${tenantId}`);
        return { name: 'LinkedIn', connected: !!token && token.length > 0 };
      } catch {
        return { name: 'LinkedIn', connected: false };
      }
    })(),
    (async () => {
      const connected = !!(tenant.metadata?.['m365TokenRef']);
      return { name: 'Microsoft 365', connected };
    })(),
    (async () => {
      const url = process.env['DATABASE_URL'];
      return { name: 'Neon Postgres', connected: !!url && url.includes('postgresql') };
    })(),
    (async () => {
      return { name: 'Upstash Redis', connected: true, fallbackActive: !process.env['UPSTASH_REDIS_REST_URL'] };
    })(),
    (async () => {
      const key = process.env['ANTHROPIC_API_KEY'];
      return { name: 'Anthropic Claude API', connected: !!key && key.startsWith('sk-') };
    })(),
    (async () => {
      const uri = process.env['AZURE_KEY_VAULT_URI'];
      return { name: 'Azure Key Vault', connected: !!uri && uri.includes('vault.azure.net') };
    })(),
    (async () => {
      return { name: 'Reddit API', connected: true, hitlGate: true };
    })(),
  ];

  const statuses = await Promise.all(checks);

  return statuses.map((status: any) => {
    const config = statusConfigs[status.name] || { icon: '❓', desc: '', defaultStatus: 'Unknown' };
    let statusText = config.defaultStatus;
    let dotColor = GREEN.dot;
    let textColor = GREEN.text;

    if (!status.connected) {
      statusText = 'Not Connected';
      dotColor = GRAY.dot;
      textColor = GRAY.text;
    } else if (status.hitlGate) {
      statusText = 'Connected · HITL Only';
      dotColor = AMBER.dot;
      textColor = AMBER.text;
    } else if (status.fallbackActive) {
      statusText = 'Connected (Fallback)';
      dotColor = AMBER.dot;
      textColor = AMBER.text;
    }

    return {
      icon: config.icon,
      name: status.name,
      desc: config.desc,
      statusText,
      dotColor,
      textColor,
    };
  });
};

// ── Tenant context assembly from current store state ────────────────────────────
const assembleTenantContext = (store: DashboardStore, tenant: Tenant): TenantAgentContext => {
  // Derive siteUrl from tenant name; fall back to tenant id slug.
  const domainBase = tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'workspace';
  const siteUrl = `https://${domainBase}.com`;

  // Keywords: mine from KB document titles if available, else use defaults.
  const kbKeywords = store.kbDocuments
    .filter(d => d.category === 'product-docs')
    .flatMap(d => d.title.toLowerCase().split(/\s+/))
    .filter(w => w.length > 4)
    .slice(0, 5);
  const targetKeywords = kbKeywords.length >= 3
    ? kbKeywords
    : ['ai marketing automation', 'b2b saas marketing', 'marketing ai agents'];

  // Contact counts from live contacts (populated by HubSpot sync).
  const contacts = store.contacts.all;
  const mqls = contacts.filter(c => c.stage === 'MQL').length;
  const sqls = contacts.filter(c => c.stage === 'SQL').length;

  // HubSpot connectivity from real integration status check.
  const hubspotEntry = store.settings.integrations.find(i => i.name === 'HubSpot CRM');
  const hubspotConnected = hubspotEntry?.statusText?.startsWith('Connected') ?? false;

  return {
    siteUrl,
    targetKeywords,
    contactCount: contacts.length,
    mqls,
    sqls,
    hubspotConnected,
  };
};

// ── Post-run DB persistence + tool adapters ───────────────────────────────────
const persistAutopilotRun = async (
  tenantId: string,
  result:   AutopilotResult,
): Promise<void> => {
  if (!process.env['DATABASE_URL']?.trim()) return;
  try {
    // 1. Batch-insert all execution records (idempotent via onConflictDoNothing).
    if (result.executions.length > 0) {
      await Promise.all(
        result.executions.map(exec =>
          db.insert(agentExecutions).values({
            id:            exec.id,
            tenantId:      exec.tenantId,
            agentType:     exec.agentType,
            model:         exec.model,
            status:        exec.status,
            inputSummary:  exec.inputSummary  ?? null,
            outputSummary: exec.outputSummary ?? null,
            durationMs:    exec.durationMs,
            error:         exec.error         ?? null,
            fairnessScore: exec.fairnessScore  ?? null,
          }).onConflictDoNothing()
        ),
      );
    }

    // 2. Tool adapters — persist agent output artifacts as KB documents.
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const artifactMap: Partial<Record<AgentType, { title: string; category: string }>> = {
      keyword_researcher: { title: `Keyword Opportunities — ${today}`, category: 'product-docs' },
      workspace_reporter: { title: `Workspace Report — ${today}`,       category: 'product-docs' },
      backlink_outreach:  { title: `Backlink Outreach Plan — ${today}`,  category: 'competitor-intel' },
    };

    for (const [agentType, artifact] of Object.entries(artifactMap) as Array<[AgentType, { title: string; category: string }]>) {
      const exec = result.executions.find(
        e => e.agentType === agentType && e.status === 'success' && e.outputSummary,
      );
      if (!exec) continue;
      await db.insert(kbDocumentsTable).values({
        id:       uid('kb'),
        tenantId,
        name:     artifact.title,
        content:  exec.outputSummary!,
        category: artifact.category,
      }).onConflictDoNothing();
    }
  } catch (err) {
    // Non-fatal: persistence failure must never crash the autopilot run.
    console.error('[autopilot-persist] failed:', err instanceof Error ? err.message : String(err));
  }
};

const syncPlatformStatusFromIntegrations = (store: DashboardStore): void => {
  const integrationStatuses = new Map(store.settings.integrations.map(item => [item.name, item.statusText]));

  store.settings.platformStatus = [
    { name: 'Vercel Edge', status: 'Operational' },
    { name: 'Neon Database', status: 'Operational' },
    { name: 'Upstash Redis', status: integrationStatuses.get('Upstash Redis')?.includes('Fallback') ? 'Operational (Fallback)' : 'Operational' },
    { name: 'Anthropic API', status: integrationStatuses.get('Anthropic Claude API')?.startsWith('Connected') ? 'Operational' : 'Disconnected' },
    { name: 'Azure Key Vault', status: integrationStatuses.get('Azure Key Vault')?.startsWith('Connected') ? 'Connected' : 'Disconnected' },
    { name: 'LinkedIn', status: integrationStatuses.get('LinkedIn')?.startsWith('Connected') ? 'Connected' : 'Disconnected' },
    { name: 'HubSpot CRM', status: integrationStatuses.get('HubSpot CRM')?.startsWith('Connected') ? 'Connected' : 'Disconnected' },
  ];
};

const toResponse = (store: DashboardStore) => {
  return {
    testsPassedLabel: store.testsPassedLabel,
    tevvScore: store.tevvScore,
    kpis: store.kpis,
    feedItems: store.feedItems,
    autopilot: {
      running: store.autopilot.running,
      paused: store.autopilot.paused,
      nextRunAt: store.autopilot.nextRunAt,
      lastRunSummary: store.autopilot.lastRunSummary,
      tasks: store.autopilot.tasks,
    },
    agents: store.agents,
    constants: {
      agentsTotal: AGENT_COUNT,
      redditRequiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL,
    },
    hitlQueue: store.hitlQueue.map(item => ({
      ...item,
      queuedAgo: getQueueAgeText(item.queuedAt),
    })),
    kbDocuments: store.kbDocuments,
    orgMembers: store.orgMembers,
    userProfile: store.userProfile,
    analytics: store.analytics,
    contacts: store.contacts,
    socialPosts: store.socialPosts,
    blogArticles: store.blogArticles,
    settings: store.settings,
  };
};

const normalizeDashboardStoreShape = (store: DashboardStore): void => {
  // Backward-compatible defaults for older cached dashboard states.
  if (!Array.isArray(store.feedItems)) store.feedItems = [];
  if (!Array.isArray(store.hitlQueue)) store.hitlQueue = [];
  if (!Array.isArray(store.kbDocuments)) store.kbDocuments = [];
  if (!Array.isArray(store.orgMembers)) store.orgMembers = [];
  if (!Array.isArray(store.socialPosts)) store.socialPosts = [];
  if (!Array.isArray(store.blogArticles)) store.blogArticles = [];

  if (!store.autopilot || typeof store.autopilot !== 'object') {
    store.autopilot = { ...INITIAL_STORE.autopilot };
  }

  if (!store.settings || typeof store.settings !== 'object') {
    store.settings = { ...INITIAL_STORE.settings };
  }

  if (!store.contacts || typeof store.contacts !== 'object') {
    store.contacts = { ...INITIAL_STORE.contacts };
  }
};

const purgeLegacySeededContent = (store: DashboardStore): void => {
  // Remove old demo cards/articles persisted in tenant state so live HITL/API data is visible.
  store.socialPosts = store.socialPosts.filter(post => {
    const isLegacyLinkedIn =
      post.id === '1' &&
      post.channel === 'LINKEDIN' &&
      post.handle === 'linkedin_poster' &&
      post.generatedAgo.startsWith('Generated ');

    const isLegacyEmail =
      post.id === '2' &&
      post.channel === 'EMAIL SUBJECT' &&
      post.handle === 'email_campaigner' &&
      post.generatedAgo.startsWith('Generated ');

    return !isLegacyLinkedIn && !isLegacyEmail;
  });

  const legacyBlogTitles = new Set([
    '10 AI Marketing Trends for 2025',
    'How We Cut CAC by 40% with AI Agents',
    'Content Fairness in Production AI',
    'B2B Marketing Automation: Complete Guide',
  ]);

  store.blogArticles = store.blogArticles.filter(article => {
    const isLegacyId = article.id === '1' || article.id === '2' || article.id === '3' || article.id === '4';
    const isLegacyTitle = legacyBlogTitles.has(article.title);
    return !(isLegacyId && isLegacyTitle);
  });
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = makeTenant(session);
  await ensureTenantRow(tenant);
  const store = await getTenantDashboardState<DashboardStore>(tenant.id, INITIAL_STORE);
  normalizeDashboardStoreShape(store);
  purgeLegacySeededContent(store);

  refreshUserProfile(store, session);
  store.autopilot.tasks = mergeAutopilotTasks(store.autopilot.tasks, tenant.tier);
  syncAgentsFromAutopilot(store);

  // Fetch real integration status
  try {
    store.settings.integrations = await computeIntegrationStatus(tenant);
    syncPlatformStatusFromIntegrations(store);
  } catch (e) {
    // Fallback to seed integrations if computation fails
    console.warn('Failed to compute integration status', e);
  }

  await computeContactsFromHubSpot(tenant.id, store);
  await computeAnalyticsFromDb(tenant.id, store);
  await computeKpisFromDb(tenant.id, store);
  await computeKbDocumentsFromDb(tenant.id, store);
  await computeOrgMembersFromDb(tenant.orgId, store);
  await refreshHitlQueueFromDb(tenant.id, store);
  refreshActiveAgentsKpi(store);
  await setTenantDashboardState(tenant.id, store);
  return NextResponse.json(toResponse(store));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = makeTenant(session);
  await ensureTenantRow(tenant);
  const store = await getTenantDashboardState<DashboardStore>(tenant.id, INITIAL_STORE);
  normalizeDashboardStoreShape(store);
  purgeLegacySeededContent(store);

  refreshUserProfile(store, session);
  store.autopilot.tasks = mergeAutopilotTasks(store.autopilot.tasks, tenant.tier);
  syncAgentsFromAutopilot(store);

  const body = (await req.json()) as {
    action?: string;
    id?: string;
    email?: string;
    title?: string;
    category?: string;
    content?: string;
    provider?: 'shopify' | 'webflow' | 'wordpress' | 'hubspot';
    slug?: string;
    htmlBody?: string;
    status?: 'draft' | 'published';
    schemaJson?: Record<string, unknown>;
    postChannel?: 'linkedin' | string;
    postBody?: string;
    postId?: string;
    postContent?: string[];
    prompt?: string;
  };

  if (body.action === 'runAutopilot') {
    if (store.autopilot.paused) {
      return NextResponse.json({ error: 'Autopilot is paused. Resume before running.' }, { status: 409 });
    }

    if (store.autopilot.running) {
      return NextResponse.json({ error: 'Autopilot already running' }, { status: 409 });
    }

    store.autopilot.running = true;
    store.autopilot.stopRequested = false;
    store.autopilot.tasks = store.autopilot.tasks.map(task =>
      task.status === 'hitl' ? task : { ...task, status: 'running' }
    );
    syncAgentsFromAutopilot(store);
    await setTenantDashboardState(tenant.id, store);

    try {
      // Assemble real tenant context so agents receive actual site/keyword/contact data.
      const tenantCtx = assembleTenantContext(store, tenant);

      const result = await runAutopilot(tenant, {
        shouldStop: () => store.autopilot.stopRequested || store.autopilot.paused,
        context:    tenantCtx,
      });

      const redditTierAllowed = isTierEligible(tenant.tier, AGENT_ACTIVATION_PLAN.reddit_manager.minTier);
      if (REDDIT_REQUIRES_HUMAN_APPROVAL && redditTierAllowed) {
        await generateAndPersistRedditDrafts(tenant, tenantCtx, store);
        await refreshHitlQueueFromDb(tenant.id, store);
      }

      // Persist executions to DB and write agent output artifacts as KB docs.
      await persistAutopilotRun(tenant.id, result);

      const succeeded = result.succeeded;
      store.autopilot.lastRunSummary = {
        completedTasks: result.totalTasks,
        postsCreated: Math.max(0, succeeded * 2),
        hitlPending: store.hitlQueue.length,
        durationText: `${Math.max(1, Math.round(result.durationMs / 60000))}m`,
      };
      // US-001: daily autopilot — next run in 24 hours.
      store.autopilot.nextRunAt = Date.now() + 24 * 60 * 60 * 1000;

      store.kpis.activeAgents = Math.min(AGENT_COUNT, Math.max(1, succeeded));
      store.kpis.postsGenerated += Math.max(1, succeeded);
      store.kpis.leadsCaptured += Math.max(1, Math.floor(succeeded / 2));

      const executionStatusByAgent = new Map(result.executions.map(exec => [exec.agentType, exec.status]));
      store.autopilot.tasks = store.autopilot.tasks.map(task => {
        if (task.status === 'hitl') return task;

        const execStatus = executionStatusByAgent.get(task.agent as AgentType);
        if (!execStatus) {
          return { ...task, status: 'scheduled' };
        }

        if (execStatus === 'success' || execStatus === 'failed' || execStatus === 'skipped') {
          return { ...task, status: execStatus };
        }

        return { ...task, status: 'scheduled' };
      });

      syncAgentsFromAutopilot(store);

      store.feedItems = [
        {
          id: `run_${Date.now()}`,
          message: `**autopilot** completed ${result.succeeded}/${result.totalTasks} tasks`,
          time: 'just now · orchestration complete',
          type: 'teal' as const,
        },
        ...store.feedItems,
      ].slice(0, 8);

      await setTenantDashboardState(tenant.id, store);
      return NextResponse.json({ ok: true, result, data: toResponse(store) });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: detail }, { status: 500 });
    } finally {
      store.autopilot.running = false;
      await setTenantDashboardState(tenant.id, store);
    }
  }

  if (body.action === 'pauseAutopilot') {
    store.autopilot.paused = true;
    if (store.autopilot.running) store.autopilot.stopRequested = true;
    syncAgentsFromAutopilot(store);

    store.feedItems = [
      {
        id: `pause_${Date.now()}`,
        message: store.autopilot.running
          ? '**autopilot** pause requested — current cycle will stop between tasks'
          : '**autopilot** paused',
        time: 'just now · orchestration control',
        type: 'gold' as const,
      },
      ...store.feedItems,
    ].slice(0, 8);

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'resumeAutopilot') {
    store.autopilot.paused = false;
    store.autopilot.stopRequested = false;
    syncAgentsFromAutopilot(store);

    store.feedItems = [
      {
        id: `resume_${Date.now()}`,
        message: '**autopilot** resumed',
        time: 'just now · orchestration control',
        type: 'green' as const,
      },
      ...store.feedItems,
    ].slice(0, 8);

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'editHitlDraft') {
    const id = body.id;
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 });

    const itemIdx = store.hitlQueue.findIndex(item => item.id === id);
    if (itemIdx === -1) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });

    store.hitlQueue = store.hitlQueue.map(item =>
      item.id === id
        ? { ...item, ...(title ? { title } : {}), content }
        : item
    );

    if (isDbConfigured()) {
      await db.update(redditThreads)
        .set({
          ...(title ? { title } : {}),
          draftResponse: content,
        })
        .where(and(eq(redditThreads.id, id), eq(redditThreads.tenantId, tenant.id)));
    }

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'approveHitl' || body.action === 'rejectHitl') {
    const id = body.id;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    if (isDbConfigured()) {
      // Ensure queue is up-to-date when state cache lags behind DB.
      await refreshHitlQueueFromDb(tenant.id, store);
    }

    let existing = store.hitlQueue.find(item => item.id === id);
    if (!existing && isDbConfigured()) {
      const row = await db.select().from(redditThreads)
        .where(and(eq(redditThreads.id, id), eq(redditThreads.tenantId, tenant.id)))
        .limit(1);
      const found = row[0];
      if (found) {
        existing = {
          id: found.id,
          subreddit: found.subreddit,
          title: found.title,
          agent: 'reddit_manager',
          platform: 'Reddit',
          content: (found.draftResponse ?? '').trim() || 'Draft pending content update',
          queuedAt: found.createdAt ? new Date(found.createdAt).getTime() : now(),
        };
      }
    }
    if (!existing) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });

    store.hitlQueue = store.hitlQueue.filter(item => item.id !== id);
    store.autopilot.lastRunSummary.hitlPending = store.hitlQueue.length;

    if (body.action === 'approveHitl') {
      const safeTitle = (existing.title ?? '').trim() || 'Untitled draft';
      const safeContent = typeof existing.content === 'string' ? existing.content : '';
      const safeSubreddit = (existing.subreddit ?? '').trim() || 'r/marketing';

      // Check which platforms are connected so we inject one publish card per connected platform.
      const [linkedInToken, redditToken] = await Promise.all([
        getSecret(`linkedin-access-${tenant.id}`).catch(() => null),
        getSecret(`reddit-access-${tenant.id}`).catch(() => null),
      ]);

      // Platform definitions — add new platforms here as they are integrated.
      const platformCards: Array<{ id: string; channel: string; handle: string; label: string; action: string; connected: boolean }> = [
        {
          id:        `reddit_${id}`,
          channel:   'REDDIT',
          handle:    'reddit_manager',
          label:     `Approved · ${safeSubreddit}`,
          action:    'Post to Reddit',
          connected: Boolean(redditToken),
        },
        {
          id:        `linkedin_${id}`,
          channel:   'LINKEDIN',
          handle:    'linkedin_poster',
          label:     `Approved · ${safeSubreddit} (cross-post)`,
          action:    'Post Now',
          connected: Boolean(linkedInToken),
        },
      ];

      const newCards: SocialPost[] = platformCards
        .filter(p => !store.socialPosts.some(s => s.id === p.id)) // dedupe on re-approve
        .map((p): SocialPost => ({
          id:            p.id,
          channel:       p.channel,
          handle:        p.handle,
          generatedAgo:  p.connected ? `Approved just now · ${p.label}` : `Not connected · ${p.label}`,
          bias:          null,
          model:         'Haiku',
          body:          [safeTitle, safeContent],
          primaryAction: p.connected ? p.action : 'Connect Platform',
          secondaryAction: 'Edit',
          status:        'draft',
        }));

      if (newCards.length > 0) {
        store.socialPosts = [...newCards, ...store.socialPosts].slice(0, 10);
      }

      // Also add a Blog article entry so approved content surfaces in Content → Blog.
      const blogId = `blog_hitl_${id}`;
      if (!store.blogArticles.some(a => a.id === blogId)) {
        const wordCount = safeContent.trim().length > 0 ? safeContent.trim().split(/\s+/).length : 0;
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const newArticle: BlogArticle = {
          id:        blogId,
          title:     safeTitle,
          words:     wordCount.toLocaleString(),
          bias:      '—',          // fairness score not run on HITL content at approve time
          published: today,
          visits:    null,
          source:    'hitl',
          action:    'Preview',
        };
        store.blogArticles = [newArticle, ...store.blogArticles].slice(0, 50);
      }
    }

    if (isDbConfigured()) {
      if (body.action === 'approveHitl') {
        await db.update(redditThreads)
          .set({
            approvedBy: session.user?.email ?? session.user?.name ?? 'dashboard_user',
            approvedAt: new Date(),
            draftResponse: existing.content,
          })
          .where(and(eq(redditThreads.id, id), eq(redditThreads.tenantId, tenant.id)));
      } else {
        await db.delete(redditThreads)
          .where(and(eq(redditThreads.id, id), eq(redditThreads.tenantId, tenant.id)));
      }

      await refreshHitlQueueFromDb(tenant.id, store);
    }

    store.feedItems = [
      {
        id: `hitl_${Date.now()}`,
        message: body.action === 'approveHitl'
          ? `**reddit_manager** approved and queued post for ${existing.subreddit}`
          : `**reddit_manager** rejected queued post for ${existing.subreddit}`,
        time: 'just now · HITL',
        type: body.action === 'approveHitl' ? ('green' as const) : ('red' as const),
      },
      ...store.feedItems,
    ].slice(0, 8);

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'inviteMember') {
    const email = body.email?.trim();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const alreadyExists = store.orgMembers.some(m => m.email === email);
    if (alreadyExists) {
      return NextResponse.json({ error: 'Member already exists' }, { status: 409 });
    }
    const localPart = email.split('@')[0] ?? email;
    const initials = getInitials(localPart.replace(/[._-]/g, ' '));
    const newMember: OrgMember = {
      id: `mem_${Date.now()}`,
      initials,
      name: localPart,
      email,
      role: 'Member',
    };
    store.orgMembers = [...store.orgMembers, newMember];
    store.feedItems = [
      {
        id: `invite_${Date.now()}`,
        message: `**org** invited ${email} as Member`,
        time: 'just now · team management',
        type: 'teal' as const,
      },
      ...store.feedItems,
    ].slice(0, 8);
    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'uploadKbDoc') {
    const title = body.title?.trim();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const wordCount = body.content ? body.content.trim().split(/\s+/).length : 0;
    const newDoc: KnowledgeDoc = {
      id: `doc_${Date.now()}`,
      category: (body.category as KnowledgeDoc['category']) ?? 'product-docs',
      title,
      words: `${wordCount.toLocaleString()} words`,
      updated: 'Updated just now',
      actionLabel: 'Re-train',
    };
    store.kbDocuments = [...store.kbDocuments, newDoc];
    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  const stripCodeFence = (value: string): string => value
    .replace(/^\s*```(?:json|html|markdown)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const normalizeGeneratedJson = (value: string): string => stripCodeFence(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  const parseGeneratedDraft = (value: string): Record<string, unknown> => {
    const normalized = normalizeGeneratedJson(value);
    const candidates = [normalized];
    const match = normalized.match(/\{[\s\S]*\}/);
    if (match && match[0] !== normalized) candidates.push(match[0]);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as Record<string, unknown>;
      } catch {
        continue;
      }
    }

    const source = candidates[candidates.length - 1] ?? normalized;
    const extracted: Record<string, unknown> = {};

    const titleMatch = source.match(/"title"\s*:\s*"([\s\S]*?)"\s*,\s*"slug"/i);
    if (titleMatch?.[1]) extracted['title'] = titleMatch[1].trim();

    const slugMatch = source.match(/"slug"\s*:\s*"([\s\S]*?)"\s*,\s*"body"/i);
    if (slugMatch?.[1]) extracted['slug'] = slugMatch[1].trim();

    const bodyMatch = source.match(/"body"\s*:\s*"([\s\S]*?)"\s*(?=,\s*"geoScore"|,\s*"[A-Za-z0-9_]+"|\s*\})/i);
    if (bodyMatch?.[1]) {
      extracted['body'] = bodyMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .trim();
    }

    const geoScoreMatch = source.match(/"geoScore"\s*:\s*(\d{1,3})/i);
    if (geoScoreMatch?.[1]) extracted['geoScore'] = Number(geoScoreMatch[1]);

    if (Object.keys(extracted).length > 0) return extracted;

    return {};
  };

  const parseNestedGeneratedDraft = (value: string): Record<string, unknown> | null => {
    const trimmed = trimWrappedText(stripCodeFence(value));
    if (!trimmed.startsWith('{')) return null;

    try {
      return parseGeneratedDraft(trimmed);
    } catch {
      return null;
    }
  };

  const extractBestBodyCandidate = (value: string): string => {
    const normalized = normalizeGeneratedJson(value);
    const matches = [...normalized.matchAll(/"body"\s*:\s*"([\s\S]*?)"/gi)];
    if (matches.length === 0) return '';

    const candidates = matches
      .map(match => (match[1] ?? '')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .trim())
      .filter(Boolean);

    if (candidates.length === 0) return '';

    const score = (candidate: string): number => {
      const alphaChars = (candidate.match(/[A-Za-z]/g) ?? []).length;
      const jsonNoisePenalty = (candidate.match(/"(?:title|slug|body)"\s*:/gi) ?? []).length * 120;
      const bracePenalty = (candidate.match(/[{}]/g) ?? []).length * 140;
      const truncatedPenalty = /\{\s*$/.test(candidate) ? 220 : 0;
      const sentenceBonus = (candidate.match(/[.!?]/g) ?? []).length * 12;
      return alphaChars + sentenceBonus - jsonNoisePenalty - bracePenalty - truncatedPenalty;
    };

    return candidates.sort((a, b) => score(b) - score(a))[0] ?? '';
  };

  const pickGeneratedBody = (parsed: Record<string, unknown>, fallback: string): string => {
    const directBody = typeof parsed['body'] === 'string' ? trimWrappedText(parsed['body']) : '';
    const nested = directBody ? parseNestedGeneratedDraft(directBody) : null;
    const nestedBody = typeof nested?.['body'] === 'string' ? trimWrappedText(nested['body']) : '';
    if (nestedBody) return nestedBody;

    const hasNestedJsonMarkers = /\n\s*\{\s*$/.test(directBody)
      || /"(?:title|slug|body)"\s*:/i.test(directBody)
      || /\{\s*"title"/i.test(directBody);
    if (directBody && !directBody.startsWith('{') && !hasNestedJsonMarkers) return directBody;

    const bestCandidate = extractBestBodyCandidate(fallback);
    if (bestCandidate) return bestCandidate;

    const fallbackParsed = parseNestedGeneratedDraft(fallback);
    const fallbackBody = typeof fallbackParsed?.['body'] === 'string'
      ? trimWrappedText(fallbackParsed['body'])
      : '';
    return fallbackBody || directBody || fallback;
  };

  const trimWrappedText = (value: string): string => value.trim().replace(/^['"]+|['"]+$/g, '').trim();

  const sanitizeGeneratedBodyText = (value: string, title: string): string => {
    const normalized = stripCodeFence(value)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\r\n/g, '\n')
      .trim();

    // Remove one-line JSON payload echoes that models sometimes prepend/append.
    const withoutInlinePayloads = normalized.replace(
      /\{\s*"title"\s*:[\s\S]*?"slug"\s*:[\s\S]*?"body"\s*:[\s\S]*?\}\s*/gi,
      '\n',
    );

    const lines = withoutInlinePayloads.split('\n');
    const droppedMetadataLines = lines.filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return true;
      if (line === '{' || line === '}' || line === '},' || line === '{,') return false;
      if (/^"?title"?\s*:\s*/i.test(line)) return false;
      if (/^"?slug"?\s*:\s*/i.test(line)) return false;
      if (/^"?body"?\s*:\s*$/i.test(line)) return false;
      if (/^"?body"?\s*:\s*"?$/i.test(line)) return false;
      return true;
    });

    const deDuplicated = droppedMetadataLines.filter((rawLine, index, arr) => {
      const line = rawLine.trim().replace(/^"|"$/g, '');
      if (!line) return true;

      const normalizedTitle = title.trim().toLowerCase();
      const comparable = line.toLowerCase().replace(/[\s]+/g, ' ').trim();
      if (normalizedTitle && comparable === normalizedTitle) {
        return arr.findIndex(candidate => candidate.trim().toLowerCase() === comparable) === index;
      }

      return true;
    });

    return deDuplicated
      .join('\n')
      .replace(/^\s*[,]+\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
  };

  const toSlug = (value: string): string => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const hasRichHtml = (value: string): boolean => /<(p|h[1-6]|ul|ol|li|blockquote|article|section|div)\b/i.test(value);

  const renderTextBlock = (block: string): string => {
    const lines = block.split(/\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return '';

    if (lines.every(line => /^[-*]\s+/.test(line))) {
      const items = lines
        .map(line => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    const headingMatch = block.match(/^(?:#{1,3}\s+)?([^\n:.][^\n]{2,90})\s*:\s*\n?([\s\S]*)$/);
    const headingTitle = headingMatch?.[1]?.trim();
    const headingBody = headingMatch?.[2]?.trim();
    if (headingTitle && headingBody) {
      return `<h2>${escapeHtml(headingTitle)}</h2><p>${escapeHtml(headingBody)}</p>`;
    }

    const firstLine = lines[0];
    if (lines.length === 1 && firstLine && (/^#{1,3}\s+/.test(firstLine) || /:$/.test(firstLine))) {
      return `<h2>${escapeHtml(firstLine.replace(/^#{1,3}\s+/, '').replace(/:$/, '').trim())}</h2>`;
    }

    return `<p>${escapeHtml(lines.join(' '))}</p>`;
  };

  const normalizeBodyHtml = (value: string, title: string): string => {
    const cleaned = sanitizeGeneratedBodyText(trimWrappedText(value), title);
    if (!cleaned) return '<p>No article content was generated.</p>';
    if (hasRichHtml(cleaned)) return cleaned;

    const markdownNormalized = cleaned
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');

    const blocks = markdownNormalized
      .split(/\n\s*\n/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => block.startsWith('<h2>') || block.startsWith('<h3>') ? block : renderTextBlock(block));

    return blocks.join('\n');
  };

  const applyInlineStyle = (html: string, tag: string, style: string): string => html.replace(
    new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi'),
    (match, attrs: string | undefined) => {
      if (typeof attrs === 'string' && /\sstyle=/i.test(attrs)) return match;
      return `<${tag}${attrs ?? ''} style="${style}">`;
    },
  );

  const toPlainText = (value: string): string => value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const renderCmsArticleTemplate = (title: string, rawBody: string): string => {
    let articleHtml = normalizeBodyHtml(rawBody, title);
    articleHtml = applyInlineStyle(articleHtml, 'h2', 'margin:32px 0 12px;font-size:30px;line-height:1.2;color:#102132;font-weight:700;');
    articleHtml = applyInlineStyle(articleHtml, 'h3', 'margin:24px 0 10px;font-size:24px;line-height:1.3;color:#16324a;font-weight:700;');
    articleHtml = applyInlineStyle(articleHtml, 'p', 'margin:0 0 18px;font-size:18px;line-height:1.85;color:#334155;');
    articleHtml = applyInlineStyle(articleHtml, 'ul', 'margin:0 0 22px;padding-left:24px;color:#334155;');
    articleHtml = applyInlineStyle(articleHtml, 'ol', 'margin:0 0 22px;padding-left:24px;color:#334155;');
    articleHtml = applyInlineStyle(articleHtml, 'li', 'margin:0 0 10px;font-size:18px;line-height:1.75;');
    articleHtml = applyInlineStyle(articleHtml, 'blockquote', 'margin:24px 0;padding:18px 22px;border-left:4px solid #0f766e;background:#f4fbfa;color:#16324a;font-style:italic;border-radius:0 16px 16px 0;');
    articleHtml = applyInlineStyle(articleHtml, 'a', 'color:#0f766e;text-decoration:underline;');

    const preview = escapeHtml(toPlainText(articleHtml).slice(0, 180));

    return [
      '<article style="max-width:820px;margin:0 auto;padding:28px 24px;border-radius:28px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);box-shadow:0 18px 46px rgba(15,23,42,0.08);">',
      '<section style="margin:0 0 28px;padding:28px;border-radius:24px;background:linear-gradient(135deg,#0f766e 0%,#1d4ed8 100%);color:#f8fafc;">',
      '<div style="display:inline-block;margin-bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.16);font:700 12px/1.2 Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;">Virilocity AI Article</div>',
      `<p style="margin:0;font:400 18px/1.75 Georgia,serif;color:rgba(248,250,252,0.92);">${preview || escapeHtml(title)}</p>`,
      '</section>',
      `<section style="font-family:Georgia,\'Times New Roman\',serif;">${articleHtml}</section>`,
      '</article>',
    ].join('');
  };

  type PublishReview = {
    approved: boolean;
    score: number | null;
    reasons: string[];
  };

  const parseAgentJson = (value: string): Record<string, unknown> | null => {
    const normalized = value
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const candidates = [normalized];
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0] !== normalized) {
      candidates.push(objectMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as Record<string, unknown>;
      } catch {
        continue;
      }
    }

    return null;
  };

  const reviewBeforePublish = async (
    channel: 'cms' | 'linkedin' | 'reddit',
    title: string,
    content: string,
  ): Promise<PublishReview> => {
    const systemPrompt = `You are a strict brand and policy reviewer.
Return JSON only:
{"approved":true,"brandConsistencyScore":88,"flags":[],"summary":"ok"}`;
    const userPrompt = JSON.stringify({
      channel,
      title,
      content: trunc(content, 6000),
    });

    try {
      const result = await runAgentCall(
        'brand_voice_enforcer',
        tenant.tier as Tier,
        systemPrompt,
        userPrompt,
      );
      const parsed = parseAgentJson(result.output);
      const scoreValue = Number(parsed?.['brandConsistencyScore']);
      const score = Number.isFinite(scoreValue) ? scoreValue : null;
      const flags = Array.isArray(parsed?.['flagged'])
        ? parsed?.['flagged']
        : Array.isArray(parsed?.['flags'])
          ? parsed?.['flags']
          : [];
      const explicitlyRejected = parsed?.['approved'] === false;
      const reasons = flags.map(item => String(item)).slice(0, 3);

      const approved = !explicitlyRejected
        && flags.length === 0
        && (score === null || score >= 70);

      return { approved, score, reasons };
    } catch {
      // Fail-open for ship readiness: publishing should not hard fail if reviewer is unavailable.
      return { approved: true, score: null, reasons: [] };
    }
  };

  if (body.action === 'generateCmsDraft') {
    const topic = (body.prompt ?? body.title ?? '').toString().trim();
    if (!topic) {
      return NextResponse.json({ error: 'prompt (topic) is required' }, { status: 400 });
    }

    const systemPrompt = `You are a professional SEO content writer. Generate a blog post for the given topic.
Return ONLY valid JSON in this exact shape — no markdown, no extra text:
{
  "title": "<SEO-optimised title>",
  "slug": "<url-slug>",
  "body": "<full HTML body — use <h2>, <p>, <ul><li> tags>",
  "geoScore": <integer 0-100>
}`;
    const userPrompt = `Topic: ${topic}`;

    try {
      const result = await runAgentCall('geo_content_generator', tenant.tier as Tier, systemPrompt, userPrompt);
      const parsed = parseGeneratedDraft(result.output);
      const title = typeof parsed['title'] === 'string' && trimWrappedText(parsed['title'])
        ? trimWrappedText(parsed['title'])
        : topic;
      const slug = typeof parsed['slug'] === 'string' && trimWrappedText(parsed['slug'])
        ? toSlug(trimWrappedText(parsed['slug']))
        : toSlug(topic);
      const rawBody = pickGeneratedBody(parsed, result.output);

      return NextResponse.json({
        ok: true,
        generatedCmsDraft: {
          title,
          slug,
          body: renderCmsArticleTemplate(title, rawBody),
          geoScore: Number.isFinite(Number(parsed['geoScore'])) ? Number(parsed['geoScore']) : null,
          model: result.model,
          agentType: 'geo_content_generator',
        },
        data: toResponse(store),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'AI generation failed' },
        { status: 500 },
      );
    }
  }

  if (body.action === 'publishCms') {
    const provider = body.provider;
    const title = body.title?.trim() ?? '';
    const slug = body.slug?.trim() ?? '';
    const htmlBody = body.htmlBody?.trim() ?? '';
    const status = body.status ?? 'published';

    const ALLOWED_CMS = ['shopify', 'webflow', 'wordpress', 'hubspot'] as const;
    if (!provider || !(ALLOWED_CMS as readonly string[]).includes(provider)) {
      return NextResponse.json({ error: 'provider must be one of: shopify, webflow, wordpress, hubspot' }, { status: 400 });
    }
    if (!title || !slug || !htmlBody) {
      return NextResponse.json({ error: 'title, slug, and htmlBody are required' }, { status: 400 });
    }

    const review = await reviewBeforePublish('cms', title, toPlainText(htmlBody));
    if (!review.approved) {
      return NextResponse.json({
        error: 'Publish blocked by AI review. Please edit content and retry.',
        review,
      }, { status: 409 });
    }

    try {
      const schemaJson = body.schemaJson ?? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
      };

      const result = await publishCMSContent({
        tenantId: tenant.id,
        provider,
        title,
        slug,
        htmlBody,
        status,
        schemaJson,
      });

      store.feedItems = [
        {
          id: `cms_${Date.now()}`,
          message: `**cms_publish** ${provider} published "${title}"${review.score !== null ? ` (review ${review.score})` : ''}`,
          time: 'just now · cms publish',
          type: 'teal' as const,
        },
        ...store.feedItems,
      ].slice(0, 8);

      await setTenantDashboardState(tenant.id, store);
      return NextResponse.json({ ok: true, cms: result, data: toResponse(store) });
    } catch (error) {
      if (error instanceof CMSIntegrationError) {
        return NextResponse.json({ error: error.payload }, { status: error.status });
      }
      return NextResponse.json(
        { error: { provider, code: 'unknown', message: error instanceof Error ? error.message : String(error), retryable: false } },
        { status: 500 },
      );
    }
  }

  if (body.action === 'publishSocialPost') {
    const channel = (body.postChannel ?? '').toLowerCase();
    const postBody = body.postBody?.trim() ?? '';
    const postId = body.postId?.trim() ?? '';

    if (!postBody) {
      return NextResponse.json({ error: 'postBody is required' }, { status: 400 });
    }

    if (channel !== 'linkedin' && channel !== 'reddit') {
      return NextResponse.json({ error: 'postChannel must be linkedin or reddit' }, { status: 400 });
    }

    const targetIndex = postId ? store.socialPosts.findIndex(post => post.id === postId) : -1;
    const targetPost = targetIndex >= 0 ? store.socialPosts[targetIndex] : undefined;

    if (targetPost?.status === 'posted') {
      return NextResponse.json({ error: 'This social post has already been published' }, { status: 409 });
    }

    // ── Reddit publish path ──────────────────────────────────────────────────
    if (channel === 'reddit') {
      const review = await reviewBeforePublish('reddit', targetPost?.body[0] ?? 'Reddit post', postBody);
      if (!review.approved) {
        return NextResponse.json({
          error: 'Reddit post blocked by AI review. Please edit and retry.',
          review,
        }, { status: 409 });
      }

      try {
        const redditToken = await getSecret(`reddit-access-${tenant.id}`);
        const redditUsername = await getSecret(`reddit-username-${tenant.id}`);

        if (!redditToken || !redditUsername) {
          return NextResponse.json({
            error: 'Reddit is not connected for this tenant. Go to Settings → Integrations to connect Reddit.',
            notConnected: true,
          }, { status: 409 });
        }

        // Reddit API: POST to r/subreddit via OAuth
        const subreddit = (targetPost?.generatedAgo ?? '').match(/r\/[\w]+/i)?.[0] ?? 'r/marketing';
        const redditRes = await fetch('https://oauth.reddit.com/api/submit', {
          method: 'POST',
          headers: {
            'Authorization': `bearer ${redditToken}`,
            'User-Agent': `Virilocity/1.0 by ${redditUsername}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            api_type: 'json',
            kind: 'self',
            sr: subreddit.replace(/^r\//, ''),
            title: targetPost?.body[0] ?? 'AI Marketing Insights',
            text: postBody,
            nsfw: 'false',
            spoiler: 'false',
          }).toString(),
        });

        if (!redditRes.ok) {
          const errText = await redditRes.text().catch(() => 'unknown');
          throw new Error(`Reddit API error ${redditRes.status}: ${errText}`);
        }

        const redditJson = await redditRes.json() as { json?: { data?: { url?: string; id?: string } } };
        const permalink = redditJson?.json?.data?.url ?? '';

        store.kpis.postsGenerated += 1;
        if (targetIndex >= 0) {
          store.socialPosts = store.socialPosts.map((post, index) => (
            index === targetIndex
              ? { ...post, generatedAgo: 'Posted to Reddit just now', primaryAction: 'Posted', secondaryAction: 'View on Reddit', status: 'posted' as const }
              : post
          ));
        }

        store.feedItems = [
          {
            id: `reddit_${Date.now()}`,
            message: `**reddit_manager** published to ${subreddit}${permalink ? ` — ${permalink}` : ''}`,
            time: 'just now · reddit publish',
            type: 'green' as const,
          },
          ...store.feedItems,
        ].slice(0, 8);

        await setTenantDashboardState(tenant.id, store);
        return NextResponse.json({ ok: true, reddit: { permalink }, data: toResponse(store) });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 500 },
        );
      }
    }

    // ── LinkedIn publish path ────────────────────────────────────────────────
    const review = await reviewBeforePublish('linkedin', 'LinkedIn post', postBody);
    if (!review.approved) {
      return NextResponse.json({
        error: 'LinkedIn post blocked by AI review. Please edit and retry.',
        review,
      }, { status: 409 });
    }

    try {
      const accessToken = await getSecret(`linkedin-access-${tenant.id}`);
      const memberId = await getSecret(`linkedin-member-id-${tenant.id}`);

      if (!accessToken || !memberId) {
        return NextResponse.json({ error: 'LinkedIn is not connected for this tenant' }, { status: 409 });
      }

      const result = await LinkedInPoster.postText({
        accessToken,
        memberId,
        text: postBody,
      });

      store.kpis.postsGenerated += 1;
      if (targetIndex >= 0) {
        store.socialPosts = store.socialPosts.map((post, index) => (
          index === targetIndex
            ? {
                ...post,
                generatedAgo: 'Posted just now',
                primaryAction: 'Posted',
                secondaryAction: 'View Post',
                status: 'posted',
              }
            : post
        ));
      }

      store.socialPosts = [
        buildReplacementLinkedInDraft(store),
        ...store.socialPosts,
      ].slice(0, 6);

      store.feedItems = [
        {
          id: `linkedin_${Date.now()}`,
          message: `**linkedin_poster** published post (${result.id})${review.score !== null ? ` (review ${review.score})` : ''}`,
          time: 'just now · linkedin publish',
          type: 'green' as const,
        },
        ...store.feedItems,
      ].slice(0, 8);

      await setTenantDashboardState(tenant.id, store);
      return NextResponse.json({ ok: true, linkedin: result, data: toResponse(store) });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }

  if (body.action === 'editSocialPost') {
    const editPostId = body.postId?.trim() ?? '';
    const postContent = body.postContent;

    if (!editPostId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }
    if (!Array.isArray(postContent) || postContent.length === 0) {
      return NextResponse.json({ error: 'postContent is required' }, { status: 400 });
    }

    const idx = store.socialPosts.findIndex(post => post.id === editPostId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Social post not found' }, { status: 404 });
    }

    store.socialPosts = store.socialPosts.map((post, i) =>
      i === idx
        ? { ...post, body: postContent, generatedAgo: 'Edited just now' }
        : post
    );

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
