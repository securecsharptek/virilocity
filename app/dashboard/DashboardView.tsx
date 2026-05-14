// ─────────────────────────────────────────────────────────────────────────────
// DashboardClient — V16.4 Glassmorphic Dashboard UI
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import DashboardHeader from '../../components/layout/DashboardHeader';
import TabButton from '../../components/ui/TabButton';
import Lever from '../../components/ui/Lever';
import KPICard from '../../components/ui/KPICard';
import GlassCard from '../../components/ui/GlassCard';
import Skeleton from '../../components/ui/Skeleton';
import IntegrationActionButton from '../../components/ui/IntegrationActionButton';
import Modal from '../../components/ui/Modal';
import SectionHeader from '../../components/ui/SectionHeader';
import ActivityFeed, { type FeedItem } from '../../components/ui/ActivityFeed';
import ToastContainer, { useToast } from '../../components/ui/Toast';
import CMSConnections from './settings/cms/CMSConnections';

const FEED_ITEMS: FeedItem[] = [
  {
    id: '1',
    message: '**blog_writer** generated "10 AI Marketing Trends" — 1,240 words',
    time: '2 min ago · Sonnet · BIAS 84.2',
    type: 'teal',
  },
  {
    id: '2',
    message: '**lead_qualifier** scored 14 new HubSpot contacts',
    time: '7 min ago · Haiku',
    type: 'green',
  },
  {
    id: '3',
    message: '**reddit_manager** awaiting approval — r/SaaSMarketing post ready',
    time: '12 min ago · HITL pending',
    type: 'gold',
  },
  {
    id: '4',
    message: '**seo_optimizer** updated 8 meta descriptions for blog posts',
    time: '18 min ago · Haiku',
    type: 'teal',
  },
  {
    id: '5',
    message: '**churn_predictor** flagged 3 at-risk accounts — score <0.28',
    time: '31 min ago · Opus',
    type: 'green',
  },
  {
    id: '6',
    message: '**email_campaigner** sent drip sequence to 142 leads',
    time: '44 min ago · Sonnet',
    type: 'teal',
  },
  {
    id: '7',
    message: '**linkedin_poster** rate limit hit — queued for 15 min',
    time: '52 min ago · auto-retry set',
    type: 'red',
  },
  {
    id: '8',
    message: '**ab_test_analyzer** declared winner — Variant B +23% CTR',
    time: '1 hr ago · Sonnet',
    type: 'teal',
  },
];

type TaskScheduleItem = {
  agent: string;
  task: string;
  model: string;
  status: 'scheduled' | 'running' | 'success' | 'failed' | 'skipped' | 'hitl';
};

const AUTOPILOT_TASKS: TaskScheduleItem[] = [
  { agent: 'keyword_researcher', task: 'Discover high-intent keywords', model: 'Sonnet', status: 'scheduled' },
  { agent: 'trend_detector', task: 'Detect emerging channel trends', model: 'Haiku', status: 'scheduled' },
  { agent: 'hs_contact_enricher', task: 'Enrich and score HubSpot contacts', model: 'Sonnet', status: 'scheduled' },
  { agent: 'bid_optimizer', task: 'Optimize bid and spend strategy', model: 'Sonnet', status: 'scheduled' },
  { agent: 'backlink_outreach', task: 'Process backlink outreach follow-ups', model: 'Sonnet', status: 'scheduled' },
  { agent: 'social_listener', task: 'Monitor mentions and sentiment', model: 'Haiku', status: 'scheduled' },
  { agent: 'ai_visibility_tracker', task: 'Track brand visibility in AI engines', model: 'Haiku', status: 'scheduled' },
  { agent: 'churn_predictor', task: 'Score churn risk across accounts', model: 'Sonnet', status: 'scheduled' },
  { agent: 'ab_test_orchestrator', task: 'Evaluate A/B test significance', model: 'Sonnet', status: 'scheduled' },
  { agent: 'workspace_reporter', task: 'Compile workspace KPI report', model: 'Haiku', status: 'scheduled' },
  { agent: 'cross_channel_orchestrator', task: 'Coordinate cross-channel actions', model: 'Sonnet', status: 'scheduled' },
  { agent: 'reddit_manager', task: 'Draft community post', model: 'Haiku', status: 'hitl' },
];

type HITLQueueItem = {
  id: string;
  subreddit: string;
  title: string;
  agent: string;
  platform: string;
  content: string;
  queuedAgo?: string;
};

const HITL_QUEUE_ITEMS: HITLQueueItem[] = [];

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

const AGENT_CARDS: AgentCard[] = [
  { id: '1', name: 'blog_writer', icon: '🔥', status: 'running', description: 'GENERATES BLOG POSTS', fairnessScore: 84.2, model: 'Sonnet', timestamp: 'Created 8h ago' },
  { id: '2', name: 'seo_optimizer', icon: '💎', status: 'running', description: 'REFRESHES META TAGS', fairnessScore: 91.0, model: 'Haiku', timestamp: 'Created 18h ago' },
  { id: '3', name: 'reddit_manager', icon: '🏆', status: 'hitl', description: '[HITL] REQUIRES HUMAN APPROVAL—STAGE 3 posts in queue awaiting review', fairnessScore: 0, model: 'Haiku', timestamp: 'Last: 12m ago' },
  { id: '4', name: 'lead_qualifier', icon: '💜', status: 'running', description: 'LEAD QUALIFIER', fairnessScore: 78.5, model: 'Haiku', timestamp: 'Started 7h ago' },
  { id: '5', name: 'churn_predictor', icon: '💰', status: 'idle', description: 'PREDICTS CHURN', fairnessScore: 89.5, model: 'Opus', timestamp: 'Last: 30m ago' },
  { id: '6', name: 'growthbot', icon: '🍀', status: 'running', description: 'GROWTH ASSISTANT', fairnessScore: 96.2, model: 'Haiku', timestamp: '11mins ago' },
  { id: '7', name: 'ab_test_analyzer', icon: '🎨', status: 'idle', description: 'ANALYZES A/B TESTS', fairnessScore: 82.8, model: 'Sonnet', timestamp: 'Last: 1h ago' },
  { id: '8', name: 'keyword_researcher', icon: '🔑', status: 'running', description: 'KEYWORD RESEARCH', fairnessScore: 87.4, model: 'Haiku', timestamp: 'Created 25m ago' },
  { id: '9', name: 'competitor_analyzer', icon: '🏅', status: 'idle', description: 'TRACKS COMPETITORS', fairnessScore: 79.6, model: 'Sonnet', timestamp: 'Last: 2h ago' },
];

type RunningAgent = {
  id: string;
  name: string;
  icon: string;
  progress: number;
  taskDescription: string;
  runningTime: string;
};

const RUNNING_AGENTS: RunningAgent[] = [
  { id: '1', name: 'blog_writer', icon: '70%', progress: 70, taskDescription: 'Generating "10 AI Marketing Trends for 2025" - 045/1200 words - Sonnet - BIAS 84.2', runningTime: '8m' },
  { id: '2', name: 'seo_optimizer', icon: '51%', progress: 51, taskDescription: 'Updating meta descriptions - 4/8 pages done - Haiku - BIAS 91.0', runningTime: '14m' },
  { id: '3', name: 'lead_qualifier', icon: '63%', progress: 63, taskDescription: 'Scoring HubSpot contacts - 12/14 processed - Haiku - No BIAS filter', runningTime: '7m' },
  { id: '4', name: 'growthbot', icon: '87%', progress: 87, taskDescription: 'Conversational AI - 14 active sessions - Haiku - BIAS 96.2 Response avg 1.2s', runningTime: '47 MINS:08' },
];

type ScheduledAgent = {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  model: string;
  estDuration: string;
  status: 'scheduled' | 'running' | 'success' | 'failed' | 'skipped' | 'hitl';
};

interface DashboardApiResponse {
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
  kbDocuments?: KnowledgeDoc[];
  orgMembers?: OrgMember[];
  userProfile?: {
    name: string;
    initials: string;
    email: string;
    tenant: string;
    tier: string;
  };
  constants?: {
    agentsTotal: number;
    redditRequiresHumanApproval: boolean;
  };
  analytics?: {
    channels: AnalyticsChannel[];
    topPages: AnalyticsTopPage[];
    funnel: FunnelStage[];
    revenueBreakdown: RevenueSegment[];
    abTests: ABTest[];
    trafficKpis?: TrafficKpis;
    conversionKpis?: ConversionKpis;
  };
  contacts?: {
    all: Contact[];
    pipelineCols: PipelineCol[];
    segments: Segment[];
    summary: {
      totalSynced: number;
      pipelineValue: string;
      activeSegments: number;
    };
  };
  socialPosts?: SocialPost[];
  blogArticles?: BlogArticle[];
  settings?: {
    billingHistory: BillingHistoryItem[];
    platformStatus: PlatformStatusItem[];
    integrations: IntegrationItem[];
    tevvControls: TevvControlItem[];
    authItems: AuthItem[];
  };
}

type A2AStepStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';
type A2ASessionStatus = 'active' | 'completed' | 'failed';

type A2AStep = {
  id: string;
  agent: string;
  status: A2AStepStatus;
  startedAt?: string;
  finishedAt?: string;
  outputSummary?: string;
  error?: string;
};

type A2AMessage = {
  id: string;
  role: 'system' | 'orchestrator' | 'agent';
  agent?: string;
  content: string;
  createdAt: string;
};

type A2ASession = {
  id: string;
  tenantId: string;
  orchestrator: string;
  agents: string[];
  goal: string;
  status: A2ASessionStatus;
  messages: A2AMessage[];
  steps: A2AStep[];
  createdAt: string;
  updatedAt: string;
};

type CampaignHistoryEntry = {
  sessionId: string;
  siteUrl: string;
  keywords: string;
  status: A2ASessionStatus;
  launchedAt: string;
};

type OrgMember = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
};

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string =>
  typeof value === 'string';

const SCHEDULED_AGENTS: ScheduledAgent[] = [
  { id: '1', name: 'content_strategist', schedule: 'Daily 07:00', nextRun: 'in 3h 14m', model: 'Sonnet', estDuration: '~45m', status: 'scheduled' },
  { id: '2', name: 'blog_writer', schedule: 'Daily 02:00', nextRun: 'in 2h 10m', model: 'Sonnet', estDuration: '~3m', status: 'scheduled' },
  { id: '3', name: 'email_campaigner', schedule: 'Daily 07:15', nextRun: 'in 3h 29m', model: 'Sonnet', estDuration: '~9m', status: 'scheduled' },
  { id: '4', name: 'reddit_manager', schedule: 'Daily 02:00', nextRun: 'in 2h 44m', model: 'Haiku', estDuration: '~30s', status: 'hitl' },
  { id: '5', name: 'churn_predictor', schedule: 'Daily 01:00', nextRun: 'in 3h 14m', model: 'Opus', estDuration: '~5m', status: 'scheduled' },
  { id: '6', name: 'competitor_analyzer', schedule: 'Weekly Mon', nextRun: 'in 2d', model: 'Sonnet', estDuration: '~8m', status: 'scheduled' },
  { id: '7', name: 'ab_test_analyzer', schedule: 'Weekly Sun', nextRun: 'in 6d', model: 'Sonnet', estDuration: '~7m', status: 'scheduled' },
];

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

const ANALYTICS_CHANNELS: AnalyticsChannel[] = [];

const ANALYTICS_TOP_PAGES: AnalyticsTopPage[] = [];

type FunnelStage = {
  label: string;
  count: number;
  percentage: number;
  dropoff?: number;
};

type TrafficKpis = {
  visitors: string;
  momLabel: string;
  pagesPerSession: string;
  avgDuration: string;
  bounceRate: string;
};

type ConversionKpis = {
  overallConvRate: string;
  trialToPaid: string;
  arr: string;
  arrGrowthLabel: string;
  churnRate: string;
  avgLtv: string;
  cacPayback: string;
  activeSubscriptions: string;
  subsMomLabel: string;
};

const DEFAULT_TRAFFIC_KPIS: TrafficKpis = {
  visitors: '—',
  momLabel: '—',
  pagesPerSession: '—',
  avgDuration: '—',
  bounceRate: '—',
};

const DEFAULT_CONVERSION_KPIS: ConversionKpis = {
  overallConvRate: '—',
  trialToPaid: '—',
  arr: '—',
  arrGrowthLabel: '—',
  churnRate: '—',
  avgLtv: '—',
  cacPayback: '—',
  activeSubscriptions: '—',
  subsMomLabel: '—',
};

const CONVERSION_FUNNEL: FunnelStage[] = [];

type RevenueSegment = {
  tier: string;
  revenue: number;
  percentage: number;
  color: string;
};

const REVENUE_BREAKDOWN: RevenueSegment[] = [];

type ABTest = {
  id: string;
  name: string;
  variantA: {
    label: string;
    lift: number; // percentage change
  };
  variantB: {
    label: string;
    lift: number;
  };
  winner?: 'A' | 'B' | 'none';
  winnerLift?: number; // advantage percentage
  confidence: number; // 0-100
  status: 'complete' | 'running' | 'too-early';
};

const AB_TESTS: ABTest[] = [];

type KnowledgeDoc = {
  id: string;
  category: 'product-docs' | 'brand' | 'competitor-intel';
  title: string;
  words: string;
  updated: string;
  actionLabel: 'Re-train' | 'Edit';
};

const kbCategoryToneClass: Record<KnowledgeDoc['category'], string> = {
  'product-docs': 'text-[rgba(20,218,214,0.85)]',
  brand:          'text-[rgba(220,178,74,0.88)]',
  'competitor-intel': 'text-[rgba(72,196,130,0.85)]',
};


const contentCategoryLabel: Record<KnowledgeDoc['category'], string> = {
  'product-docs': 'Product Docs',
  brand: 'Brand',
  'competitor-intel': 'Competitor Intel',
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

// const SOCIAL_POSTS: SocialPost[] = [
//   {
//     id: '1',
//     channel: 'LINKEDIN',
//     handle: 'linkedin_poster',
//     generatedAgo: 'Generated 1h ago',
//     bias: '88.2',
//     model: 'Sonnet',
//     body: [
//       '🚀 We just hit 284 leads this week — all generated by our AI agent stack.',
//       'The breakdown: blog_writer → SEO traffic, lead_qualifier → scores in HubSpot, email_campaigner → nurture sequences. Human effort: reviewing HITL-gated content (15 min/day).',
//       'The ROI math is starting to make a lot of sense. What\'s your experience with AI-assisted marketing? 👇 #AI #SaaS #Marketing',
//     ],
//     primaryAction: 'Post Now',
//     secondaryAction: 'Edit',
//     status: 'draft',
//   },
//   {
//     id: '2',
//     channel: 'EMAIL SUBJECT',
//     handle: 'email_campaigner',
//     generatedAgo: 'Generated 2h ago',
//     bias: null,
//     model: 'Haiku',
//     body: [
//       'Subject: "Your AI marketing team ran 34 tasks while you slept"',
//       'Preview: See what your agents accomplished overnight...',
//     ],
//     primaryAction: 'Send',
//     secondaryAction: 'A/B Test',
//     status: 'draft',
//   },
// ];

type BlogArticle = {
  id: string;
  title: string;
  words: string;
  bias: string;
  published: string | null;
  visits: string | null;
  source?: 'hitl' | 'agent' | 'manual';
  action: 'Preview' | 'View';
};

const BLOG_ARTICLES: BlogArticle[] = [];

type Contact = {
  id: string;
  name: string;
  company: string;
  stage: 'Customer' | 'SQL' | 'MQL' | 'Lead';
  leadScore: number;
  lastEnriched: string;
  risk: 'Low' | 'Medium' | 'High' | null;
};

const CONTACTS: Contact[] = [
  { id: '1', name: 'Sarah Chen',      company: 'TechFlow Inc',    stage: 'Customer', leadScore: 94, lastEnriched: '2h ago',  risk: 'Low'    },
  { id: '2', name: 'Marcus Williams', company: 'GrowthLabs',      stage: 'SQL',      leadScore: 87, lastEnriched: '4h ago',  risk: 'Low'    },
  { id: '3', name: 'Priya Patel',     company: 'Scale.io',        stage: 'MQL',      leadScore: 71, lastEnriched: '8h ago',  risk: 'Medium' },
  { id: '4', name: 'Jordan Lee',      company: 'Nexus Digital',   stage: 'Customer', leadScore: 88, lastEnriched: '1d ago',  risk: 'High'   },
  { id: '5', name: 'Alex Romero',     company: 'BrightPath Co',   stage: 'Lead',     leadScore: 42, lastEnriched: '2d ago',  risk: null     },
  { id: '6', name: 'Kim Nakamura',    company: 'DataDriven LLC',  stage: 'SQL',      leadScore: 83, lastEnriched: '3h ago',  risk: 'Low'    },
  { id: '7', name: "Chris O'Brien",   company: 'LaunchFast',      stage: 'Customer', leadScore: 91, lastEnriched: '6h ago',  risk: 'Medium' },
];

const STAGE_STYLE: Record<Contact['stage'], React.CSSProperties> = {
  Customer: { border: '1px solid rgba(14,200,198,0.55)', background: 'rgba(14,100,98,0.28)', color: 'rgba(24,222,220,0.95)' },
  SQL:      { border: '1px solid rgba(140,100,220,0.55)', background: 'rgba(100,60,180,0.22)', color: 'rgba(190,160,255,0.95)' },
  MQL:      { border: '1px solid rgba(80,140,240,0.5)',  background: 'rgba(50,90,200,0.22)',  color: 'rgba(140,190,255,0.95)' },
  Lead:     { border: '1px solid rgba(180,200,220,0.3)', background: 'rgba(180,200,220,0.08)', color: 'rgba(200,220,245,0.7)'  },
};

const RISK_STYLE: Record<string, React.CSSProperties> = {
  Low:    { color: 'rgba(60,200,110,0.9)'  },
  Medium: { color: 'rgba(240,190,60,0.9)'  },
  High:   { color: 'rgba(240,90,80,0.95)'  },
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

const PIPELINE_COLS: PipelineCol[] = [
  {
    stage: 'LEADS', count: 48, value: '$0', valueColor: 'rgba(220,235,255,0.88)',
    headerColor: 'rgba(200,220,245,0.55)', borderColor: 'rgba(180,200,230,0.14)',
    glow: '0 6px 20px rgba(0,0,0,0.4)',
    more: 45,
    leads: [
      { company: 'LaunchFast', score: 42 },
      { company: 'Momentum Co', score: 38 },
    ],
  },
  {
    stage: 'MQL', count: 32, value: '$28K', valueColor: 'rgba(100,180,255,0.95)',
    headerColor: 'rgba(100,160,255,0.65)', borderColor: 'rgba(80,130,240,0.22)',
    glow: '0 6px 20px rgba(0,0,0,0.4)',
    more: 28,
    leads: [
      { company: 'Scale.io', score: 71 },
      { company: 'AgileCorp', score: 68 },
    ],
  },
  {
    stage: 'SQL', count: 18, value: '$72K', valueColor: 'rgba(24,222,220,0.97)',
    headerColor: 'rgba(24,218,214,0.7)', borderColor: 'rgba(14,200,198,0.24)',
    glow: '0 6px 20px rgba(0,0,0,0.4)',
    more: 15,
    leads: [
      { company: 'GrowthLabs', score: 87 },
      { company: 'DataDriven', score: 83 },
    ],
  },
  {
    stage: 'CUSTOMER', count: 88, value: '$42K MRR', valueColor: 'rgba(255,210,90,0.97)',
    headerColor: 'rgba(255,200,70,0.65)', borderColor: 'rgba(220,170,50,0.55)',
    glow: '0 0 0 1px rgba(220,170,50,0.35), 0 6px 28px rgba(0,0,0,0.5), 0 0 32px rgba(200,155,30,0.28), 0 0 60px rgba(180,135,20,0.14)',
    more: 85,
    leads: [
      { company: 'TechFlow', score: 94 },
      { company: "Chris O'Brien", score: 91 },
    ],
  },
];

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

type CmsPlatformConnection = {
  provider: string;
  configured: boolean;
  connected: boolean;
  statusText: string;
  details?: string;
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

const SEGMENTS: Segment[] = [
  { id: '1', name: 'At-Risk Customers',    contacts: 3,  contactsAlert: true,  criteria: 'Churn score <0.3',        lastUpdated: '31m ago', action: 'Email Campaign', actionVariant: 'teal' },
  { id: '2', name: 'High-Value SQLs',      contacts: 12, contactsAlert: false, criteria: 'Score >80 & stage=SQL',   lastUpdated: '3h ago',  action: 'Email Campaign', actionVariant: 'teal' },
  { id: '3', name: 'Trial Users · Day 7',  contacts: 28, contactsAlert: false, criteria: 'Trial, joined 7d ago',    lastUpdated: 'Daily',   action: 'Drip Sequence',  actionVariant: 'teal' },
  { id: '4', name: 'Engaged MQLs',         contacts: 44, contactsAlert: false, criteria: 'Stage=MQL & 3+ visits',  lastUpdated: '6h ago',  action: 'Email Campaign', actionVariant: 'teal' },
  { id: '5', name: 'Enterprise Prospects', contacts: 8,  contactsAlert: false, criteria: 'Company size >200',       lastUpdated: '1d ago',  action: 'Sales Outreach', actionVariant: 'gold' },
];

const BILLING_HISTORY: BillingHistoryItem[] = [
  { date: 'Apr 12, 2026', amount: '$499.00', status: 'Paid' },
  { date: 'Mar 12, 2026', amount: '$499.00', status: 'Paid' },
  { date: 'Feb 12, 2026', amount: '$399.00', status: 'Paid' },
  { date: 'Jan 12, 2026', amount: '$399.00', status: 'Paid' },
];

const PLATFORM_STATUS: PlatformStatusItem[] = [
  { name: 'Vercel Edge', status: 'Operational' },
  { name: 'Neon Database', status: 'Operational' },
  { name: 'Upstash Redis', status: 'Operational' },
  { name: 'Anthropic API', status: 'Operational' },
  { name: 'Azure Key Vault', status: 'Operational' },
  { name: 'HubSpot CRM', status: 'Connected' },
];

// Integrations are now fetched from API in /dashboard/data
const INTEGRATIONS: IntegrationItem[] = [];

const TEVV_CONTROLS: TevvControlItem[] = [
  { code: 'F-01: Docker USER node (non-root)', detail: 'CI gate: whoami === node' },
  { code: 'F-02: HMAC-SHA256 Webhooks', detail: '±300s replay window · CWE-208' },
  { code: 'F-03: RateLimiter never fails open', detail: 'Returns false on all errors' },
  { code: 'F-04: WCAG 2.2 AA Accessibility', detail: 'axe-core CI · 0 violations' },
];

const AUTH_ITEMS: AuthItem[] = [
  { name: 'JWT · RS256 Algorithm', detail: 'Azure Key Vault · Entra ID', badge: 'Active' },
  { name: 'SAML SSO (Enterprise)', detail: 'Microsoft Entra ID', badge: 'Active' },
  { name: 'Rate Limiter', detail: '60 req/min · Upstash + memory', badge: 'Active' },
  { name: 'OWASP ASVS V3.4.1/V3.4.2', detail: 'Auth middleware compliance', badge: 'Pass' },
  { name: 'Test Suite', detail: '503/503 PASS', badge: '100%' },
];

export default function DashboardClient() {
  const toast = useToast();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState('dash');
  const [activeDashLever, setActiveDashLever] = useState('overview');
  const [activeAgentsLever, setActiveAgentsLever] = useState('all');
  const [activeAnalyticsLever, setActiveAnalyticsLever] = useState('traffic');
  const [activeContentLever, setActiveContentLever] = useState('kb');
  const [activeContactsLever, setActiveContactsLever] = useState('all');
  const [activeSettingsLever, setActiveSettingsLever] = useState('billing');
  const [testsPassedLabel, setTestsPassedLabel] = useState('503/503 PASS');
  const [tevvScore, setTevvScore] = useState(95.4);
  const [nextRunAt, setNextRunAt] = useState<number>(Date.now() + 2 * 60 * 60 * 1000);
  const [autopilotRunning, setAutopilotRunning] = useState(false);
  const [autopilotPaused, setAutopilotPaused] = useState(false);
  const [countdownText, setCountdownText] = useState('02:04:03');
  const [kpis, setKpis] = useState({
    activeAgents: 0,
    postsGenerated: 0,
    leadsCaptured: 0,
    mrr: 0,
  });
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [autopilotTasks, setAutopilotTasks] = useState<TaskScheduleItem[]>(AUTOPILOT_TASKS);
  const [hitlQueueItems, setHitlQueueItems] = useState<HITLQueueItem[]>(HITL_QUEUE_ITEMS);
  const [agentCards, setAgentCards] = useState<AgentCard[]>(AGENT_CARDS);
  const [runningAgents, setRunningAgents] = useState<RunningAgent[]>(RUNNING_AGENTS);
  const [scheduledAgents, setScheduledAgents] = useState<ScheduledAgent[]>(SCHEDULED_AGENTS);
  const [analyticsChannels, setAnalyticsChannels] = useState<AnalyticsChannel[]>(ANALYTICS_CHANNELS);
  const [analyticsTopPages, setAnalyticsTopPages] = useState<AnalyticsTopPage[]>(ANALYTICS_TOP_PAGES);
  const [conversionFunnel, setConversionFunnel] = useState<FunnelStage[]>(CONVERSION_FUNNEL);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueSegment[]>(REVENUE_BREAKDOWN);
  const [abTests, setAbTests] = useState<ABTest[]>(AB_TESTS);
  const [trafficKpis, setTrafficKpis] = useState<TrafficKpis>(DEFAULT_TRAFFIC_KPIS);
  const [conversionKpis, setConversionKpis] = useState<ConversionKpis>(DEFAULT_CONVERSION_KPIS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelineCols, setPipelineCols] = useState<PipelineCol[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [contactsSummary, setContactsSummary] = useState({
    totalSynced: 0,
    pipelineValue: '$0',
    activeSegments: 0,
  });
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatusItem[]>(PLATFORM_STATUS);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INTEGRATIONS);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [tevvControls, setTevvControls] = useState<TevvControlItem[]>(TEVV_CONTROLS);
  const [authItems, setAuthItems] = useState<AuthItem[]>(AUTH_ITEMS);
  const [lastRunSummary, setLastRunSummary] = useState({
    completedTasks: 0,
    postsCreated: 0,
    hitlPending: 0,
    durationText: '—',
  });
  const [userProfile, setUserProfile] = useState({ name: '', initials: '', email: '', tenant: '', tier: 'free' });
  const [kbDocuments, setKbDocuments] = useState<KnowledgeDoc[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);
  const [agentsTotal, setAgentsTotal] = useState(39);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [kbUploadTitle, setKbUploadTitle] = useState('');
  const [kbUploadCategory, setKbUploadCategory] = useState<'product-docs' | 'brand' | 'competitor-intel'>('product-docs');
  const [kbUploadContent, setKbUploadContent] = useState('');
  const [showKbUpload, setShowKbUpload] = useState(false);
  const [kbUploadLoading, setKbUploadLoading] = useState(false);
  const [viewKbDocState, setViewKbDocState] = useState<{ id: string; name: string; category: string; content: string } | null>(null);
  const [viewKbDocLoading, setViewKbDocLoading] = useState(false);
  const [retrainLoadingDocId, setRetrainLoadingDocId] = useState<string | null>(null);
  const [kbFileLoading, setKbFileLoading] = useState(false);
  const [kbFileName, setKbFileName] = useState<string | null>(null);
  const [editDraftItem, setEditDraftItem] = useState<HITLQueueItem | null>(null);
  const [editDraftContent, setEditDraftContent] = useState('');
  const [editDraftTitle, setEditDraftTitle] = useState('');
  const [editDraftSaving, setEditDraftSaving] = useState(false);
  const [dashboardLoadState, setDashboardLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [integrationActionLoading, setIntegrationActionLoading] = useState<string | null>(null);
  const [socialActionLoadingId, setSocialActionLoadingId] = useState<string | null>(null);
  const [editSocialPost, setEditSocialPost] = useState<SocialPost | null>(null);
  const [editSocialBody, setEditSocialBody] = useState('');
  const [editSocialSaving, setEditSocialSaving] = useState(false);
  const [a2aSiteUrl, setA2aSiteUrl] = useState('https://example.com');
  const [a2aKeywordsInput, setA2aKeywordsInput] = useState('ai marketing automation, seo platform');
  const [a2aLaunchLoading, setA2aLaunchLoading] = useState(false);
  const [a2aSessionId, setA2aSessionId] = useState('');
  const [a2aSessionStatus, setA2aSessionStatus] = useState<A2ASessionStatus | null>(null);
  const [a2aSteps, setA2aSteps] = useState<A2AStep[]>([]);
  const [a2aMessages, setA2aMessages] = useState<A2AMessage[]>([]);
  const [a2aError, setA2aError] = useState<string | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistoryEntry[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('virilocity_campaign_history') : null;
      return raw ? (JSON.parse(raw) as CampaignHistoryEntry[]) : [];
    } catch { return []; }
  });
  
  // Agent filter state
  const [agentFilterStatus, setAgentFilterStatus] = useState<'all' | 'running' | 'idle' | 'hitl'>('all');
  const [showAllAgents, setShowAllAgents] = useState(false);
  const agentsDisplayLimit = 9;
  
  const nextRunUtcLabel = new Date(nextRunAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  // Compute filtered agents based on selected filter status
  const filteredAgents = agentFilterStatus === 'all'
    ? agentCards
    : agentCards.filter(a => a.status === agentFilterStatus);
  
  const displayedAgents = showAllAgents ? filteredAgents : filteredAgents.slice(0, agentsDisplayLimit);
  const hasMoreAgents = filteredAgents.length > agentsDisplayLimit;
  const isAnalyticsTrafficLoading = dashboardLoadState === 'loading';
  const isAnalyticsConversionsLoading = dashboardLoadState === 'loading';
  const isAnalyticsAbTestsLoading = dashboardLoadState === 'loading';

  const integrationRows: IntegrationItem[] = integrations.filter(item => item.name !== 'WordPress CMS');
  const connectedIntegrations = integrationRows.filter(item => item.statusText.toLowerCase().startsWith('connected')).length;
  const hubspotConnected = integrations.some(
    item => item.name === 'HubSpot CRM' && item.statusText.toLowerCase().startsWith('connected'),
  );
  const isLightTheme = theme === 'light';

  const integrationActionConfig: Record<string, { label: string; href?: string; enabled: boolean }> = {
    'HubSpot CRM': { label: 'Sync HubSpot', href: '/api/hubspot/auth', enabled: true },
    'LinkedIn': { label: 'Connect LinkedIn', href: '/api/linkedin/auth', enabled: true },
    'Microsoft 365': { label: 'Connect M365', enabled: false },
    'Anthropic Claude API': { label: 'Connect Claude', enabled: false },
    'Azure Key Vault': { label: 'Connect Vault', enabled: false },
    'Neon Postgres': { label: 'Connect Neon', enabled: false },
    'Upstash Redis': { label: 'Connect Upstash', enabled: false },
    'Reddit API': { label: 'Connect Reddit', enabled: false },
  };

  const getIntegrationActionState = (name: string, statusText: string): { label: string; enabled: boolean; href?: string } => {
    const cfg = integrationActionConfig[name];
    if (!cfg) return { label: 'Connect', enabled: false };

    if (name === 'HubSpot CRM' && statusText.toLowerCase().startsWith('connected')) {
      return { label: 'Disconnect', enabled: true, href: '/api/hubspot/disconnect' };
    }

    if (name === 'LinkedIn' && statusText.toLowerCase().startsWith('connected')) {
      return { label: 'Disconnect', enabled: true, href: '/api/linkedin/disconnect' };
    }

    return { label: cfg.label, enabled: cfg.enabled, href: cfg.href };
  };

  const handleIntegrationAction = (name: string, statusText: string) => {
    const cfg = getIntegrationActionState(name, statusText);
    if (!cfg.enabled || !cfg.href) {
      toast.info(`${name} integration action will be enabled in next step.`);
      return;
    }

    setIntegrationActionLoading(name);
    window.location.assign(cfg.href);
  };

  useEffect(() => {
    const stored = localStorage.getItem('virilocity-dashboard-theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('virilocity-dashboard-theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncCountdown = () => {
      const seconds = Math.max(0, Math.floor((nextRunAt - Date.now()) / 1000));
      const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      setCountdownText(`${hh}:${mm}:${ss}`);
    };

    syncCountdown();
    const timer = window.setInterval(syncCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [nextRunAt]);

  const applyDashboardData = (data: DashboardApiResponse) => {
    if (isString(data.testsPassedLabel)) {
      setTestsPassedLabel(data.testsPassedLabel);
      setAuthItems(prev => prev.map(item => (
        item.name === 'Test Suite' ? { ...item, detail: data.testsPassedLabel } : item
      )));
    }

    if (isNumber(data.tevvScore)) {
      setTevvScore(data.tevvScore);
    }

    if (data.kpis && typeof data.kpis === 'object') {
      setKpis(prev => ({
        activeAgents: isNumber(data.kpis.activeAgents) ? data.kpis.activeAgents : prev.activeAgents,
        postsGenerated: isNumber(data.kpis.postsGenerated) ? data.kpis.postsGenerated : prev.postsGenerated,
        leadsCaptured: isNumber(data.kpis.leadsCaptured) ? data.kpis.leadsCaptured : prev.leadsCaptured,
        mrr: isNumber(data.kpis.mrr) ? data.kpis.mrr : prev.mrr,
      }));
    }

    if (Array.isArray(data.feedItems)) {
      setFeedItems(data.feedItems);
    }

    if (data.autopilot && typeof data.autopilot === 'object') {
      if (Array.isArray(data.autopilot.tasks)) {
        setAutopilotTasks(data.autopilot.tasks);
      }
      if (typeof data.autopilot.running === 'boolean') {
        setAutopilotRunning(data.autopilot.running);
      }
      if (typeof data.autopilot.paused === 'boolean') {
        setAutopilotPaused(data.autopilot.paused);
      }
      if (isNumber(data.autopilot.nextRunAt)) {
        setNextRunAt(data.autopilot.nextRunAt);
      }
      if (data.autopilot.lastRunSummary && typeof data.autopilot.lastRunSummary === 'object') {
        setLastRunSummary(prev => ({
          completedTasks: isNumber(data.autopilot.lastRunSummary.completedTasks)
            ? data.autopilot.lastRunSummary.completedTasks
            : prev.completedTasks,
          postsCreated: isNumber(data.autopilot.lastRunSummary.postsCreated)
            ? data.autopilot.lastRunSummary.postsCreated
            : prev.postsCreated,
          hitlPending: isNumber(data.autopilot.lastRunSummary.hitlPending)
            ? data.autopilot.lastRunSummary.hitlPending
            : prev.hitlPending,
          durationText: isString(data.autopilot.lastRunSummary.durationText)
            ? data.autopilot.lastRunSummary.durationText
            : prev.durationText,
        }));
      }
    }

    if (Array.isArray(data.hitlQueue)) {
      setHitlQueueItems(data.hitlQueue);
    }

    if (data.agents && typeof data.agents === 'object') {
      if (Array.isArray(data.agents.all)) {
        setAgentCards(data.agents.all);
      }
      if (Array.isArray(data.agents.running)) {
        setRunningAgents(data.agents.running);
      }
      if (Array.isArray(data.agents.scheduled)) {
        setScheduledAgents(data.agents.scheduled);
      }
    }

    if (Array.isArray(data.kbDocuments)) {
      setKbDocuments(data.kbDocuments);
    }

    if (Array.isArray(data.orgMembers)) {
      setOrgMembers(data.orgMembers);
    }

    if (data.userProfile && typeof data.userProfile === 'object') {
      setUserProfile(data.userProfile);
    }

    if (data.constants?.agentsTotal) {
      setAgentsTotal(data.constants.agentsTotal);
    }

    if (data.analytics && typeof data.analytics === 'object') {
      if (Array.isArray(data.analytics.channels)) {
        setAnalyticsChannels(data.analytics.channels);
      }
      if (Array.isArray(data.analytics.topPages)) {
        setAnalyticsTopPages(data.analytics.topPages);
      }
      if (Array.isArray(data.analytics.funnel)) {
        setConversionFunnel(data.analytics.funnel);
      }
      if (Array.isArray(data.analytics.revenueBreakdown)) {
        setRevenueBreakdown(data.analytics.revenueBreakdown);
      }
      if (Array.isArray(data.analytics.abTests)) {
        setAbTests(data.analytics.abTests);
      }
      if (data.analytics.trafficKpis && typeof data.analytics.trafficKpis === 'object') {
        setTrafficKpis(data.analytics.trafficKpis as TrafficKpis);
      }
      if (data.analytics.conversionKpis && typeof data.analytics.conversionKpis === 'object') {
        setConversionKpis(data.analytics.conversionKpis as ConversionKpis);
      }
    }

    if (data.contacts && typeof data.contacts === 'object') {
      if (Array.isArray(data.contacts.all)) {
        setContacts(data.contacts.all);
      }
      if (Array.isArray(data.contacts.pipelineCols)) {
        setPipelineCols(data.contacts.pipelineCols);
      }
      if (Array.isArray(data.contacts.segments)) {
        setSegments(data.contacts.segments);
      }
      if (data.contacts.summary && typeof data.contacts.summary === 'object') {
        setContactsSummary(prev => ({
          totalSynced: isNumber(data.contacts?.summary.totalSynced) ? data.contacts.summary.totalSynced : prev.totalSynced,
          pipelineValue: isString(data.contacts?.summary.pipelineValue) ? data.contacts.summary.pipelineValue : prev.pipelineValue,
          activeSegments: isNumber(data.contacts?.summary.activeSegments) ? data.contacts.summary.activeSegments : prev.activeSegments,
        }));
      }
    }

    if (Array.isArray(data.socialPosts)) {
      setSocialPosts(data.socialPosts);
    }

    if (Array.isArray(data.blogArticles)) {
      setBlogArticles(data.blogArticles.slice(0, 50));
    }

    if (data.settings && typeof data.settings === 'object') {
      if (Array.isArray(data.settings.billingHistory)) {
        setBillingHistory(data.settings.billingHistory);
      }
      if (Array.isArray(data.settings.platformStatus)) {
        setPlatformStatuses(data.settings.platformStatus);
      }
      if (Array.isArray(data.settings.integrations)) {
        setIntegrations(data.settings.integrations);
      }
      if (Array.isArray(data.settings.tevvControls)) {
        setTevvControls(data.settings.tevvControls);
      }
      if (Array.isArray(data.settings.authItems)) {
        setAuthItems(data.settings.authItems);
      }
    }
  };

  const refreshDashboardData = async (silent = true) => {
    if (!silent) {
      setDashboardLoadState('loading');
      setDashboardLoadError(null);
    }

    try {
      const res = await fetch('/dashboard/data', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const data = (await res.json()) as DashboardApiResponse;
      applyDashboardData(data);
      setDashboardLoadState('ready');
      setDashboardLoadError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load dashboard data';
      if (!silent) {
        setDashboardLoadState('error');
        setDashboardLoadError(msg);
      }
      if (!silent) {
        toast.error(msg);
      }
    }
  };

  useEffect(() => {
    void refreshDashboardData(false);
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshDashboardData(true);
    }, 15000);

    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hubspot = params.get('hubspot');
    const linkedin = params.get('linkedin');
    const reason = params.get('reason');
    const tab = params.get('tab');
    const lever = params.get('lever');

    const hasOauthStatus = Boolean(hubspot || linkedin);
    const hasNavigationHint = Boolean(tab || lever);
    if (!hasOauthStatus && !hasNavigationHint) return;

    if (tab === 'settings') {
      setActiveTab('settings');
      if (lever === 'billing' || lever === 'team' || lever === 'integrations' || lever === 'cms' || lever === 'security') {
        setActiveSettingsLever(lever);
      }
    }

    if (hubspot === 'connected') {
      toast.success('HubSpot connected successfully.');
    } else if (hubspot === 'disconnected') {
      toast.info('HubSpot disconnected successfully.');
    } else if (hubspot === 'error') {
      const decodedReason = reason ? decodeURIComponent(reason) : 'Unknown error';
      toast.error(`HubSpot error: ${decodedReason}`);
    }

    if (linkedin === 'connected') {
      toast.success('LinkedIn connected successfully.');
    } else if (linkedin === 'disconnected') {
      toast.info('LinkedIn disconnected successfully.');
    } else if (linkedin === 'error') {
      const decodedReason = reason ? decodeURIComponent(reason) : 'Unknown error';
      toast.error(`LinkedIn error: ${decodedReason}`);
    }

    params.delete('hubspot');
    params.delete('linkedin');
    params.delete('reason');
    params.delete('tab');
    params.delete('lever');
    const next = params.toString();
    const cleanedUrl = `${window.location.pathname}${next ? `?${next}` : ''}`;
    window.history.replaceState({}, '', cleanedUrl);
  }, [toast]);

  const openSocialEdit = (post: SocialPost) => {
    setEditSocialPost(post);
    setEditSocialBody(post.body.join('\n\n'));
  };

  const closeSocialEdit = () => {
    setEditSocialPost(null);
    setEditSocialBody('');
  };

  const handleEditSocialSave = async () => {
    if (!editSocialPost) return;
    const trimmed = editSocialBody.trim();
    if (!trimmed) {
      toast.error('Post content cannot be empty.');
      return;
    }

    setEditSocialSaving(true);
    try {
      const paragraphs = trimmed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      const result = await postAction('editSocialPost', undefined, {
        postId: editSocialPost.id,
        postContent: paragraphs,
      });
      if (result.data) applyDashboardData(result.data);
      toast.success('Post updated.');
      closeSocialEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save post.');
    } finally {
      setEditSocialSaving(false);
    }
  };

  const handleSocialPrimaryAction = async (post: SocialPost) => {
    if (post.status === 'posted') {
      toast.info('This post has already been published.');
      return;
    }

    // Platform not connected — guide user to Settings
    if (post.primaryAction === 'Connect Platform') {
      setActiveTab('settings');
      setActiveSettingsLever('integrations');
      toast.info(`Connect ${post.channel} in Settings → Integrations, then return here to publish.`);
      return;
    }

    const ch = post.channel.toLowerCase();

    if (ch !== 'linkedin' && ch !== 'reddit') {
      toast.info(`${post.primaryAction} action will be enabled in the next step.`);
      return;
    }

    setSocialActionLoadingId(post.id);

    try {
      const postBody = post.body.join('\n\n').trim();
      const result = await postAction('publishSocialPost', undefined, {
        postId: post.id,
        postChannel: ch,
        postBody,
      });

      if (result.data) {
        applyDashboardData(result.data);
      }

      if (ch === 'reddit') {
        toast.success('Posted to Reddit successfully.');
      } else {
        toast.success('LinkedIn post published successfully.');
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Publish failed';
      // If Reddit not connected, guide user to Settings
      if (errMsg.includes('not connected')) {
        toast.error('Reddit not connected. Go to Settings → Integrations to connect.');
      } else {
        toast.error(errMsg);
      }
    } finally {
      setSocialActionLoadingId(null);
    }
  };

  const postAction = async (action: string, id?: string, extra?: Record<string, unknown>) => {
    const res = await fetch('/dashboard/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id, ...extra }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? 'Action failed');
    }

    return (await res.json()) as {
      data?: DashboardApiResponse;
      result?: { succeeded: number; totalTasks: number };
    };
  };

  const fetchA2ASession = async (sessionId: string) => {
    const res = await fetch(`/api/a2a/session?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? 'Failed to load A2A session');
    }

    const body = (await res.json()) as { ok?: boolean; session?: A2ASession };
    if (!body.ok || !body.session) {
      throw new Error('Invalid A2A session response');
    }

    setA2aSessionStatus(body.session.status);
    setA2aSteps(body.session.steps ?? []);
    setA2aMessages(body.session.messages ?? []);
    return body.session;
  };

  const handleLaunchDeepSeoCampaign = async () => {
    const normalizedKeywords = a2aKeywordsInput
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (normalizedKeywords.length === 0) {
      toast.error('Please enter at least one target keyword.');
      return;
    }

    setA2aLaunchLoading(true);
    setA2aError(null);

    try {
      const idem = `deep-seo-${a2aSiteUrl.trim().toLowerCase()}-${normalizedKeywords.join('|').toLowerCase()}`.slice(0, 120);
      const res = await fetch('/api/seo/campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idem,
        },
        body: JSON.stringify({
          siteUrl: a2aSiteUrl.trim(),
          targetKeywords: normalizedKeywords,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? 'Failed to start deep SEO campaign');
      }

      const body = (await res.json()) as {
        ok?: boolean;
        sessionId?: string;
        status?: A2ASessionStatus;
        reused?: boolean;
      };

      if (!body.ok || !body.sessionId) {
        throw new Error('Invalid campaign launch response');
      }

      setA2aSessionId(body.sessionId);
      setA2aSessionStatus(body.status ?? 'active');
      await fetchA2ASession(body.sessionId);

      // Persist to campaign history
      const histEntry: CampaignHistoryEntry = {
        sessionId: body.sessionId,
        siteUrl: a2aSiteUrl.trim(),
        keywords: a2aKeywordsInput,
        status: body.status ?? 'active',
        launchedAt: new Date().toISOString(),
      };
      setCampaignHistory(prev => {
        const next = [histEntry, ...prev.filter(e => e.sessionId !== body.sessionId)].slice(0, 10);
        try { localStorage.setItem('virilocity_campaign_history', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });

      if (body.reused) {
        toast.success('Deep SEO session reused from idempotency key.');
      } else {
        toast.success('Deep SEO campaign started. Monitoring live progress...');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start deep SEO campaign';
      setA2aError(msg);
      toast.error(msg);
    } finally {
      setA2aLaunchLoading(false);
    }
  };

  const handleLoadCampaignSession = async (entry: CampaignHistoryEntry) => {
    setA2aSiteUrl(entry.siteUrl);
    setA2aKeywordsInput(entry.keywords);
    setA2aSessionId(entry.sessionId);
    setA2aSessionStatus(entry.status);
    setA2aError(null);
    try {
      await fetchA2ASession(entry.sessionId);
    } catch (e) {
      setA2aError(e instanceof Error ? e.message : 'Failed to load session');
    }
  };

  const updateHistoryStatus = (sessionId: string, status: A2ASessionStatus) => {
    setCampaignHistory(prev => {
      const next = prev.map(e => e.sessionId === sessionId ? { ...e, status } : e);
      try { localStorage.setItem('virilocity_campaign_history', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleClearCampaignHistory = () => {
    setCampaignHistory([]);
    try {
      localStorage.removeItem('virilocity_campaign_history');
    } catch {
      // Ignore storage failures and keep in-memory clear.
    }
    toast.success('Campaign history cleared.');
  };

  useEffect(() => {
    if (!a2aSessionId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;
    const maxPolls = 120; // 6 minutes at 3s intervals

    const stopPolling = () => {
      cancelled = true;
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const poll = async () => {
      if (cancelled) return;
      pollCount += 1;
      if (pollCount > maxPolls) {
        stopPolling();
        toast.info('Campaign monitoring paused after 6 minutes. Use Refresh or relaunch to check latest status.');
        return;
      }

      try {
        const session = await fetchA2ASession(a2aSessionId);
        if (cancelled) return;

        if (session.status === 'completed') {
          stopPolling();
          updateHistoryStatus(a2aSessionId, 'completed');
          toast.success('Deep SEO campaign completed.');
        } else if (session.status === 'failed') {
          stopPolling();
          updateHistoryStatus(a2aSessionId, 'failed');
          toast.error('Deep SEO campaign failed. Review step errors.');
        }
      } catch (error) {
        if (cancelled) return;
        setA2aError(error instanceof Error ? error.message : 'Session polling failed');
      }
    };

    void poll();
    timer = window.setInterval(() => { void poll(); }, 3000) as unknown as ReturnType<typeof setTimeout>;

    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a2aSessionId]);

  const handleRunAutopilot = async () => {
    try {
      if (autopilotPaused) {
        toast.info('Autopilot is paused. Resume it before running.');
        return;
      }

      toast.info('Autopilot started. Polling progress every 5 seconds...');
      const result = await postAction('runAutopilot');
      if (result.data) applyDashboardData(result.data);

      if (result.result) {
        toast.success(`Autopilot finished: ${result.result.succeeded}/${result.result.totalTasks} tasks succeeded.`);
      } else {
        toast.success('Autopilot finished successfully.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to run autopilot';
      toast.error(msg);
    }
  };

  const handleToggleAutopilotPause = async () => {
    try {
      const action = autopilotPaused ? 'resumeAutopilot' : 'pauseAutopilot';
      const result = await postAction(action);
      if (result.data) applyDashboardData(result.data);

      if (autopilotPaused) {
        toast.success('Autopilot resumed.');
      } else if (autopilotRunning) {
        toast.info('Pause requested. Current cycle will stop between tasks.');
      } else {
        toast.success('Autopilot paused.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update autopilot state';
      toast.error(msg);
    }
  };

  const handleHitlAction = async (id: string, action: 'approveHitl' | 'rejectHitl') => {
    try {
      const target = hitlQueueItems.find(item => item.id === id);
      const result = await postAction(action, id);
      if (result.data) applyDashboardData(result.data);

      // Optimistic UI bridge: show approved HITL content immediately in Content sections.
      if (action === 'approveHitl' && target) {
        const safeTitle = (target.title ?? '').trim() || 'Untitled draft';
        const safeContent = (target.content ?? '').trim();
        const safeSubreddit = (target.subreddit ?? '').trim() || 'r/marketing';

        const optimisticSocial: SocialPost[] = [
          {
            id: `reddit_${id}`,
            channel: 'REDDIT',
            handle: 'reddit_manager',
            generatedAgo: `Approved just now · Approved · ${safeSubreddit}`,
            bias: null,
            model: 'Haiku',
            body: [safeTitle, safeContent],
            primaryAction: 'Post to Reddit',
            secondaryAction: 'Edit',
            status: 'draft',
          },
          {
            id: `linkedin_${id}`,
            channel: 'LINKEDIN',
            handle: 'linkedin_poster',
            generatedAgo: `Approved just now · Approved · ${safeSubreddit} (cross-post)`,
            bias: null,
            model: 'Haiku',
            body: [safeTitle, safeContent],
            primaryAction: 'Post Now',
            secondaryAction: 'Edit',
            status: 'draft',
          },
        ];

        setSocialPosts(prev => {
          const ids = new Set(prev.map(p => p.id));
          const merged = [...optimisticSocial.filter(p => !ids.has(p.id)), ...prev];
          return merged.slice(0, 10);
        });

        const wordCount = safeContent.length > 0 ? safeContent.split(/\s+/).length : 0;
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const optimisticArticle: BlogArticle = {
          id: `blog_hitl_${id}`,
          title: safeTitle,
          words: wordCount.toLocaleString(),
          bias: '—',
          published: today,
          visits: null,
          source: 'hitl',
          action: 'Preview',
        };

        setBlogArticles(prev => {
          if (prev.some(a => a.id === optimisticArticle.id)) return prev;
          return [optimisticArticle, ...prev].slice(0, 50);
        });
      }

      // Ensure UI catches up even if POST response came from stale cache shape.
      void refreshDashboardData(true);

      toast.success(action === 'approveHitl'
        ? 'Approved & saved. Draft awaiting manual Reddit posting.'
        : 'Item rejected and removed from queue.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to process HITL action';
      toast.error(msg);
    }
  };

  const handleEditDraftOpen = (item: HITLQueueItem) => {
    setEditDraftItem(item);
    setEditDraftTitle(item.title);
    setEditDraftContent(item.content);
  };

  const handleEditDraftSave = async () => {
    if (!editDraftItem) return;
    if (!editDraftContent.trim()) {
      toast.error('Draft content cannot be empty.');
      return;
    }
    setEditDraftSaving(true);
    try {
      // Persist the edited draft back to the queue via the dashboard BFF
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editHitlDraft',
          id: editDraftItem.id,
          title: editDraftTitle.trim(),
          content: editDraftContent.trim(),
        }),
      });
      if (res.ok) {
        const result = (await res.json()) as { data?: DashboardApiResponse };
        if (result.data) applyDashboardData(result.data);
        // Also update local state immediately so UI reflects edit without re-fetch
        setHitlQueueItems(prev => prev.map(i =>
          i.id === editDraftItem.id
            ? { ...i, title: editDraftTitle.trim(), content: editDraftContent.trim() }
            : i
        ));
        toast.success('Draft updated.');
      } else {
        // Optimistic local update even if server save fails (BFF may not support this action yet)
        setHitlQueueItems(prev => prev.map(i =>
          i.id === editDraftItem.id
            ? { ...i, title: editDraftTitle.trim(), content: editDraftContent.trim() }
            : i
        ));
        toast.success('Draft updated locally.');
      }
      setEditDraftItem(null);
    } catch {
      toast.error('Failed to save draft.');
    } finally {
      setEditDraftSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Enter a valid email address.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inviteMember', email: inviteEmail.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? 'Invite failed');
      }
      const result = (await res.json()) as { data?: DashboardApiResponse };
      if (result.data) applyDashboardData(result.data);
      toast.success(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to invite member';
      toast.error(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleKbUpload = async () => {
    if (!kbUploadTitle.trim()) {
      toast.error('Document title is required.');
      return;
    }
    setKbUploadLoading(true);
    try {
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadKbDoc',
          title: kbUploadTitle.trim(),
          category: kbUploadCategory,
          content: kbUploadContent,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? 'Upload failed');
      }
      const result = (await res.json()) as { data?: DashboardApiResponse };
      if (result.data) applyDashboardData(result.data);
      toast.success(`"${kbUploadTitle.trim()}" added to Knowledge Base.`);
      setKbUploadTitle('');
      setKbUploadContent('');
      setKbUploadCategory('product-docs');
      setShowKbUpload(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to upload document';
      toast.error(msg);
    } finally {
      setKbUploadLoading(false);
    }
  };

  const handleViewKbDoc = async (docId: string) => {
    setViewKbDocLoading(true);
    try {
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'viewKbDoc', docId }),
      });
      if (!res.ok) throw new Error('Failed to load document');
      const result = (await res.json()) as { ok: boolean; document?: { id: string; name: string; category: string; content: string } };
      if (result.document) setViewKbDocState(result.document);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load document';
      toast.error(msg);
    } finally {
      setViewKbDocLoading(false);
    }
  };

  const handleRetrainKbDoc = async (docId: string, docTitle: string) => {
    setRetrainLoadingDocId(docId);
    try {
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retrainKbDoc', docId }),
      });
      if (!res.ok) throw new Error('Re-train failed');
      const json = (await res.json()) as { wordCount?: number };
      const words = json.wordCount ? ` · ${json.wordCount.toLocaleString()} words` : '';
      toast.success(`"${docTitle}" improved & saved${words}`);
      // Refresh KB list to show updated word count
      const refreshRes = await fetch('/dashboard/data', { method: 'GET' });
      if (refreshRes.ok) {
        const refreshed = (await refreshRes.json()) as DashboardApiResponse;
        if (refreshed.kbDocuments) setKbDocuments(refreshed.kbDocuments);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Re-train failed';
      toast.error(msg);
    } finally {
      setRetrainLoadingDocId(null);
    }
  };

  return (
    <div className={`min-h-screen dashboard-theme dashboard-theme--${theme}`}>
      {/* Container with max-width */}
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 pb-10">
        {/* Header */}
        <DashboardHeader
          user={{
            name: userProfile.name || 'Loading…',
            initials: userProfile.initials || '…',
          }}
          tenant={
            userProfile.tenant
              ? `${userProfile.tenant} · ${userProfile.tier.charAt(0).toUpperCase() + userProfile.tier.slice(1)}`
              : 'Loading…'
          }
          status={{ text: 'LIVE', count: testsPassedLabel }}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        />

        {/* Main Glass Shell */}
        <div className="glass-shell">
          {/* Tab Rail */}
          <div className="px-5 pt-[18px] pb-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.38)] to-[rgba(0,0,0,0.15)] border-b border-[rgba(255,255,255,0.055)]">
            <div className="font-mono text-[7.5px] tracking-[3px] text-[rgba(255,255,255,0.18)] mb-3 uppercase">
              Platform Navigation
            </div>
            <div className="flex gap-[7px] flex-wrap">
              <TabButton
                active={activeTab === 'dash'}
                icon="⌂"
                onClick={() => setActiveTab('dash')}
              >
                Dashboard
              </TabButton>
              <TabButton
                active={activeTab === 'agents'}
                icon="◎"
                count={39}
                onClick={() => setActiveTab('agents')}
              >
                Agents
              </TabButton>
              <TabButton
                active={activeTab === 'analytics'}
                icon="◈"
                onClick={() => setActiveTab('analytics')}
              >
                Analytics
              </TabButton>
              <TabButton
                active={activeTab === 'content'}
                icon="◻"
                onClick={() => setActiveTab('content')}
              >
                Content
              </TabButton>
              <TabButton
                active={activeTab === 'contacts'}
                icon="◉"
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </TabButton>
              <TabButton
                active={activeTab === 'settings'}
                variant="gold"
                icon="◌"
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </TabButton>
            </div>
          </div>

          {/* Lever Zones */}
          {activeTab === 'dash' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever
                  label="Overview"
                  active={activeDashLever === 'overview'}
                  onClick={() => setActiveDashLever('overview')}
                />
                <Lever
                  label="Autopilot"
                  active={activeDashLever === 'autopilot'}
                  onClick={() => setActiveDashLever('autopilot')}
                />
                <Lever
                  label="HITL Queue"
                  active={activeDashLever === 'hitl'}
                  onClick={() => setActiveDashLever('hitl')}
                />
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever
                  label="All Agents"
                  active={activeAgentsLever === 'all'}
                  onClick={() => setActiveAgentsLever('all')}
                />
                <Lever
                  label="Running"
                  active={activeAgentsLever === 'running'}
                  onClick={() => setActiveAgentsLever('running')}
                />
                <Lever
                  label="Scheduled"
                  active={activeAgentsLever === 'scheduled'}
                  onClick={() => setActiveAgentsLever('scheduled')}
                />
                <Lever
                  label="Campaigns"
                  active={activeAgentsLever === 'campaigns'}
                  onClick={() => setActiveAgentsLever('campaigns')}
                />
                <Lever
                  label="Campaign History"
                  active={activeAgentsLever === 'campaign-history'}
                  onClick={() => setActiveAgentsLever('campaign-history')}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever
                  label="Traffic"
                  active={activeAnalyticsLever === 'traffic'}
                  onClick={() => setActiveAnalyticsLever('traffic')}
                />
                <Lever
                  label="Conversions"
                  active={activeAnalyticsLever === 'conversions'}
                  onClick={() => setActiveAnalyticsLever('conversions')}
                />
                <Lever
                  label="A/B Tests"
                  active={activeAnalyticsLever === 'ab-tests'}
                  onClick={() => setActiveAnalyticsLever('ab-tests')}
                />
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever
                  label="Knowledge Base"
                  active={activeContentLever === 'kb'}
                  onClick={() => setActiveContentLever('kb')}
                />
                <Lever
                  label="Social Posts"
                  active={activeContentLever === 'social'}
                  onClick={() => setActiveContentLever('social')}
                />
                <Lever
                  label="Blog"
                  active={activeContentLever === 'blog'}
                  onClick={() => setActiveContentLever('blog')}
                />
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever label="All Contacts" active={activeContactsLever === 'all'}      onClick={() => setActiveContactsLever('all')} />
                <Lever label="Pipeline"     active={activeContactsLever === 'pipeline'} onClick={() => setActiveContactsLever('pipeline')} />
                <Lever label="Segments"     active={activeContactsLever === 'segments'} onClick={() => setActiveContactsLever('segments')} />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex items-end gap-0 px-[22px] py-3.5 bg-gradient-to-b from-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.1)] border-b border-[rgba(255,255,255,0.045)]">
              <div className="font-mono text-[7px] tracking-[3px] text-[rgba(255,255,255,0.16)] uppercase pr-2.5 mr-[18px] border-r border-[rgba(255,255,255,0.07)] self-center [writing-mode:vertical-lr] rotate-180">
                View
              </div>
              <div className="flex gap-[22px] items-end">
                <Lever label="Billing"      active={activeSettingsLever === 'billing'}      onClick={() => setActiveSettingsLever('billing')} />
                <Lever label="Team"         active={activeSettingsLever === 'team'}         onClick={() => setActiveSettingsLever('team')} />
                <Lever label="Integrations" active={activeSettingsLever === 'integrations'} onClick={() => setActiveSettingsLever('integrations')} />
                <Lever label="CMS"          active={activeSettingsLever === 'cms'}          onClick={() => setActiveSettingsLever('cms')} />
                <Lever label="Security"     active={activeSettingsLever === 'security'}     onClick={() => setActiveSettingsLever('security')} />
              </div>
            </div>
          )}
          {/* ── SETTINGS PLACEHOLDER — replace below with real sections ── */}
          {/* Content Area */}
          <div className="min-h-[560px] px-5 py-[22px] bg-gradient-to-b from-[rgba(0,8,20,0.58)] to-[rgba(0,4,12,0.4)]">
            {dashboardLoadState === 'loading' && (
              <div className="mb-4 space-y-3" aria-label="Loading dashboard sections">
                <Skeleton className="h-10 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                  <Skeleton className="lg:col-span-2 h-52 rounded-2xl" />
                  <Skeleton className="h-52 rounded-2xl" />
                </div>
                <Skeleton className="h-48 rounded-2xl" />
              </div>
            )}

            <div className={dashboardLoadState === 'loading' ? 'opacity-0 pointer-events-none select-none h-0 overflow-hidden' : ''}>

            {dashboardLoadState === 'error' && (
              <GlassCard className="mb-4 px-4 py-3 border-[rgba(210,85,85,0.35)] bg-[rgba(95,20,20,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[10px] text-[rgba(255,170,170,0.9)] uppercase tracking-[1.5px]">
                    Failed to load dashboard data: {dashboardLoadError ?? 'unknown error'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshDashboardData(false);
                    }}
                    className="rounded-full border border-[rgba(255,170,170,0.42)] bg-[rgba(255,255,255,0.06)] px-3 py-1 font-mono text-[9px] text-[rgba(255,210,210,0.95)] hover:bg-[rgba(255,255,255,0.12)]"
                  >
                    Retry
                  </button>
                </div>
              </GlassCard>
            )}

            {activeTab === 'dash' && activeDashLever === 'overview' && (
              <div>
                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-[18px]">
                  <KPICard
                    title="Active Agents"
                    icon="◎"
                    value={kpis.activeAgents}
                    variant="teal"
                    change="▲ +3 from yesterday"
                    subtitle="of 39 total agents"
                  />
                  <KPICard
                    title="Posts Generated"
                    icon="◻"
                    value={kpis.postsGenerated}
                    variant="teal"
                    change="▲ +12 vs avg"
                    subtitle="today · across all channels"
                  />
                  <KPICard
                    title="Leads Captured"
                    icon="◉"
                    value={kpis.leadsCaptured}
                    variant="green"
                    valueColor="green"
                    change="▲ +31 this week"
                    subtitle="HubSpot synced"
                  />
                  <KPICard
                    title="MRR"
                    icon="$"
                    value={`$${kpis.mrr.toLocaleString()}`}
                    variant="gold"
                    valueColor="gold"
                    change="▲ +$640 this month"
                    subtitle="Microsoft Marketplace · Enterprise tier"
                  />
                </div>

                {/* Chart and Activity Feed */}
                <div className="flex flex-col lg:flex-row gap-3.5">
                  {/* Chart Area */}
                  <div className="flex-1">
                    <GlassCard className="p-4 mb-3.5">
                      <SectionHeader
                        title="Agent Executions · 7 Days"
                        rightContent={
                          <div className="flex gap-3.5">
                            <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.35)]">
                              <div className="w-2 h-2 rounded-full bg-[rgba(14,200,198,0.8)]" />
                              Executions
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.35)]">
                              <div className="w-2 h-2 rounded-full bg-[rgba(201,168,76,0.8)]" />
                              Fairness Passes
                            </div>
                          </div>
                        }
                      />
                      
                      {/* Chart - SVG visualization */}
                      <div className="h-[90px] relative">
                        <svg viewBox="0 0 580 100" className="w-full h-full">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(14,200,198,0.35)" />
                              <stop offset="100%" stopColor="rgba(14,124,123,0)" />
                            </linearGradient>
                            <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(201,168,76,0.25)" />
                              <stop offset="100%" stopColor="rgba(201,168,76,0)" />
                            </linearGradient>
                          </defs>
                          
                          {/* Grid lines */}
                          <line x1="0" y1="25" x2="580" y2="25" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                          <line x1="0" y1="50" x2="580" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                          <line x1="0" y1="75" x2="580" y2="75" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                          
                          {/* Fairness area */}
                          <path
                            d="M10 65 L93 58 L176 62 L259 50 L342 55 L425 45 L508 40 L570 38 L570 95 L10 95 Z"
                            fill="url(#chartGradient2)"
                            opacity="0.8"
                          />
                          <path
                            d="M10 65 L93 58 L176 62 L259 50 L342 55 L425 45 L508 40 L570 38"
                            fill="none"
                            stroke="rgba(201,168,76,0.55)"
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                          />
                          
                          {/* Main executions area */}
                          <path
                            d="M10 72 L93 52 L176 68 L259 35 L342 48 L425 28 L508 18 L570 22 L570 95 L10 95 Z"
                            fill="url(#chartGradient)"
                          />
                          <path
                            d="M10 72 L93 52 L176 68 L259 35 L342 48 L425 28 L508 18 L570 22"
                            fill="none"
                            stroke="rgba(14,200,198,0.9)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          <circle cx="259" cy="35" r="4" fill="rgba(14,200,198,1)" style={{filter: 'drop-shadow(0 0 6px rgba(14,200,198,0.9))'}} />
                          <circle cx="570" cy="22" r="4" fill="rgba(14,200,198,1)" style={{filter: 'drop-shadow(0 0 8px rgba(14,200,198,0.9))'}} />
                          
                          {/* Day labels */}
                          <text x="10" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Mon</text>
                          <text x="80" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Tue</text>
                          <text x="163" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Wed</text>
                          <text x="246" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Thu</text>
                          <text x="329" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Fri</text>
                          <text x="412" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Sat</text>
                          <text x="558" y="99" fill="rgba(255,255,255,0.22)" fontFamily="DM Mono,monospace" fontSize="8">Sun</text>
                        </svg>
                      </div>
                      
                      {/* Channel distribution */}
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.28)]">
                          ▪ Executions per channel (today)
                        </div>
                        <div className="flex gap-3.5">
                          <span className="font-mono text-[9px] text-[rgba(14,200,198,0.7)]">Blog 18</span>
                          <span className="font-mono text-[9px] text-[rgba(14,200,198,0.7)]">LinkedIn 12</span>
                          <span className="font-mono text-[9px] text-[rgba(14,200,198,0.7)]">Email 9</span>
                          <span className="font-mono text-[9px] text-[rgba(201,168,76,0.8)]">Reddit ⚠ HITL</span>
                        </div>
                      </div>
                    </GlassCard>

                    {/* TEVV Status Card */}
                    <GlassCard
                      variant="teal"
                      className="p-4 bg-[rgba(14,124,123,0.07)] border-[rgba(14,124,123,0.28)]"
                    >
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="font-mono text-[9px] tracking-[2px] text-[rgba(14,200,198,0.6)] uppercase">
                          NIST TEVV Compliance
                        </div>
                        <div className="font-display text-xl font-bold text-[rgba(14,200,198,0.9)] [text-shadow:0_0_20px_rgba(14,200,198,0.4)]">
                          {tevvScore.toFixed(1)}
                          <span className="text-[11px] text-[rgba(255,255,255,0.35)]">/100</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ F-01 Docker USER node
                        </div>
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ F-02 HMAC-SHA256 ±300s
                        </div>
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ F-03 RateLimiter safe
                        </div>
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ F-04 WCAG 2.2 AA
                        </div>
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ BIAS score &gt; 70 gate
                        </div>
                        <div className="font-mono text-[9px] text-[rgba(30,165,80,0.8)]">
                          ✓ HITL reddit_manager
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Activity Feed */}
                  <div className="w-full lg:w-[300px] lg:flex-shrink-0">
                    <GlassCard className="p-4">
                      <SectionHeader
                        title="Live Activity"
                        rightContent={
                          <div className="flex items-center gap-1.5">
                            <div className="pulse-dot teal" />
                            <span className="font-mono text-[8.5px] text-[rgba(14,200,198,0.5)]">
                              LIVE
                            </span>
                          </div>
                        }
                      />
                      <ActivityFeed items={feedItems} />
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dash' && activeDashLever === 'autopilot' && (
              <div>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Left: Countdown & Summary */}
                  <div className="flex-1 space-y-4">
                    {/* Countdown Timer */}
                    <GlassCard variant="teal" className="p-8">
                      <div className="text-center">
                        <div className="font-mono text-[11px] tracking-[3px] text-[rgba(14,200,198,0.6)] uppercase mb-4">
                          Next Autopilot Run
                        </div>
                        <div className="font-display text-6xl font-bold text-[rgba(14,200,198,0.95)] mb-5 tracking-wider [text-shadow:0_0_35px_rgba(14,200,198,0.6)]">
                          {countdownText}
                        </div>
                        <div className="font-mono text-[11px] text-[rgba(255,255,255,0.45)] mb-6 leading-relaxed">
                          Every 24 hrs · CRON: 0 6 * * * · NEXT: {nextRunUtcLabel} UTC
                        </div>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => {
                              void handleRunAutopilot();
                            }}
                            disabled={autopilotRunning || autopilotPaused}
                            className="px-6 py-2.5 rounded-full bg-gradient-to-br from-[rgba(14,124,123,0.7)] to-[rgba(0,60,60,0.8)] border border-[rgba(14,200,198,0.4)] text-[rgba(14,200,198,1)] font-bold text-[13px] tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_24px_rgba(14,124,123,0.3)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.45),0_0_35px_rgba(14,124,123,0.5)] transition-all flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <span className="text-[15px]">▶</span> {autopilotRunning ? 'Running…' : autopilotPaused ? 'Paused' : 'Run Now'}
                          </button>
                          <button
                            onClick={() => {
                              void handleToggleAutopilotPause();
                            }}
                            className="px-6 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.5)] font-bold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.8)] hover:border-[rgba(255,255,255,0.25)] transition-all flex items-center gap-2.5"
                          >
                            <span className="text-[15px]">{autopilotPaused ? '▶' : '⏸'}</span> {autopilotPaused ? 'Resume' : 'Pause'}
                          </button>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Last Run Summary */}
                    <GlassCard className="p-6">
                      <div className="font-mono text-[11px] tracking-[2.5px] text-[rgba(255,255,255,0.4)] uppercase mb-5">
                        Last Run Summary
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(14,124,123,0.12)] to-[rgba(0,38,38,0.08)] border border-[rgba(14,124,123,0.28)]">
                          <div className="font-display text-5xl font-bold text-[rgba(14,200,198,0.95)] mb-2 [text-shadow:0_0_24px_rgba(14,200,198,0.5)]">
                            {lastRunSummary.completedTasks}
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            ✓ Completed in {lastRunSummary.durationText} · All agents · No issues
                          </div>
                        </div>
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(14,124,123,0.12)] to-[rgba(0,38,38,0.08)] border border-[rgba(14,124,123,0.28)]">
                          <div className="font-display text-5xl font-bold text-[rgba(14,200,198,0.95)] mb-2 [text-shadow:0_0_24px_rgba(14,200,198,0.5)]">
                            {lastRunSummary.postsCreated}
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            Posts created in last run
                          </div>
                        </div>
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(201,168,76,0.12)] to-[rgba(55,35,0,0.08)] border border-[rgba(201,168,76,0.32)]">
                          <div className="font-display text-5xl font-bold text-[rgba(255,210,100,0.95)] mb-2 [text-shadow:0_0_24px_rgba(201,168,76,0.5)]">
                            {lastRunSummary.hitlPending}
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            Awaiting human approval
                          </div>
                        </div>
                      </div>
                    </GlassCard>

                  </div>

                  {/* Right: Task Schedule */}
                  <div className="w-full lg:w-[448px] xl:w-[470px] lg:flex-shrink-0">
                    <GlassCard className="px-4 pt-4 pb-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="font-mono text-[8.5px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                          Task Schedule
                        </div>
                        <div className="rounded-full border border-[rgba(14,124,123,0.28)] bg-[rgba(14,124,123,0.1)] px-3 py-1 font-mono text-[8px] text-[rgba(14,200,198,0.82)] shadow-[0_0_18px_rgba(14,124,123,0.12)]">
                          Daily Cron
                        </div>
                      </div>

                      <table className="mt-0.5 w-full table-fixed border-collapse">
                        <colgroup>
                          <col className="w-[31%]" />
                          <col className="w-[34%]" />
                          <col className="w-[15%]" />
                          <col className="w-[20%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-[rgba(255,255,255,0.075)]">
                            <th className="pb-2 text-left font-mono text-[7.5px] tracking-[2.2px] text-[rgba(255,255,255,0.28)] uppercase font-normal">Agent</th>
                            <th className="pb-2 text-left font-mono text-[7.5px] tracking-[2.2px] text-[rgba(255,255,255,0.28)] uppercase font-normal">Task</th>
                            <th className="pb-2 text-left font-mono text-[7.5px] tracking-[2.2px] text-[rgba(255,255,255,0.28)] uppercase font-normal">Model</th>
                            <th className="pb-2 text-left font-mono text-[7.5px] tracking-[2.2px] text-[rgba(255,255,255,0.28)] uppercase font-normal">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autopilotTasks.map((item) => (
                            <tr
                              key={item.agent}
                              className="border-b border-[rgba(255,255,255,0.045)] transition-colors hover:bg-[rgba(255,255,255,0.018)]"
                            >
                              <td className="py-[10px] pr-3 align-middle font-[Rajdhani] text-[12.5px] font-semibold leading-none text-[rgba(255,255,255,0.9)]">
                                {item.agent}
                              </td>
                              <td className="py-[10px] pr-3 align-middle font-mono text-[9px] leading-none text-[rgba(255,255,255,0.52)]">
                                {item.task}
                              </td>
                              <td className="py-[10px] pr-3 align-middle font-mono text-[9px] leading-none text-[rgba(255,255,255,0.5)]">
                                {item.model}
                              </td>
                              <td className="py-[10px] align-middle">
                                <span
                                  className={[
                                    'inline-flex min-w-[74px] items-center justify-center rounded-full border px-2.5 py-[3px] font-mono text-[8px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                                    item.status === 'hitl'
                                      ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.14)] text-[rgba(255,210,100,0.94)] shadow-[0_0_14px_rgba(201,168,76,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                      : item.status === 'running'
                                        ? 'border-[rgba(14,200,198,0.45)] bg-[rgba(14,124,123,0.2)] text-[rgba(14,220,218,0.96)] shadow-[0_0_14px_rgba(14,124,123,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                        : item.status === 'success'
                                          ? 'border-[rgba(30,165,80,0.42)] bg-[rgba(30,120,60,0.18)] text-[rgba(120,255,170,0.92)] shadow-[0_0_12px_rgba(30,120,60,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                          : item.status === 'failed'
                                            ? 'border-[rgba(255,90,90,0.4)] bg-[rgba(170,40,40,0.18)] text-[rgba(255,150,150,0.92)] shadow-[0_0_12px_rgba(170,40,40,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                            : item.status === 'skipped'
                                              ? 'border-[rgba(160,160,170,0.38)] bg-[rgba(90,90,110,0.2)] text-[rgba(220,220,230,0.88)] shadow-[0_0_10px_rgba(90,90,110,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]'
                                              : 'border-[rgba(100,50,180,0.38)] bg-[rgba(100,50,180,0.14)] text-[rgba(180,140,255,0.86)] shadow-[0_0_12px_rgba(100,50,180,0.14),inset_0_1px_0_rgba(255,255,255,0.08)]',
                                  ].join(' ')}
                                >
                                  {item.status === 'hitl'
                                    ? 'HITL Gate'
                                    : item.status === 'running'
                                      ? 'Running'
                                      : item.status === 'success'
                                        ? 'Success'
                                        : item.status === 'failed'
                                          ? 'Failed'
                                          : item.status === 'skipped'
                                            ? 'Skipped'
                                            : 'Scheduled'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dash' && activeDashLever === 'hitl' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    Human-in-the-Loop Queue
                  </div>
                  <div className="rounded-full border border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(255,210,100,0.92)] shadow-[0_0_18px_rgba(201,168,76,0.15)]">
                    {hitlQueueItems.length} Pending Approval
                  </div>
                </div>

                {/* Queue Items */}
                <div className="space-y-4">
                  {hitlQueueItems.map((item) => (
                    <GlassCard key={item.id} className="p-5 border-[rgba(255,255,255,0.08)]">
                      {/* Header with subreddit and title */}
                      <div className="mb-3.5 pb-3 border-b border-[rgba(255,255,255,0.09)]">
                        <div className="font-[Rajdhani] text-[17px] font-bold text-[rgba(14,200,198,0.96)] leading-tight mb-2">
                          {item.subreddit} — "{item.title}"
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] text-[rgba(255,255,255,0.42)]">
                            {item.agent}
                          </span>
                          <span className="text-[rgba(255,255,255,0.22)]">·</span>
                          <span className="font-mono text-[10px] text-[rgba(255,255,255,0.42)]">
                            {item.platform}
                          </span>
                          <span className="text-[rgba(255,255,255,0.22)]">·</span>
                          <span className="font-mono text-[10px] text-[rgba(255,255,255,0.42)]">
                            Queued {item.queuedAgo ?? 'recently'}
                          </span>
                          <span className="text-[rgba(255,255,255,0.22)]">·</span>
                          <span className="rounded-full border border-[rgba(201,168,76,0.38)] bg-[rgba(201,168,76,0.12)] px-2.5 py-1 font-mono text-[8px] text-[rgba(255,210,100,0.92)] font-medium">
                            ✧ AWAITING
                          </span>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="mb-5 px-4 py-4 rounded-lg bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.08)]">
                        <p className="font-[Rajdhani] text-[13.5px] leading-relaxed text-[rgba(255,255,255,0.75)]">
                          {item.content}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => {
                            void handleHitlAction(item.id, 'approveHitl');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-[rgba(14,124,123,0.65)] to-[rgba(0,60,60,0.75)] border-2 border-[rgba(14,200,198,0.4)] text-[rgba(14,200,198,1)] font-bold text-[13px] tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.4),0_0_22px_rgba(14,124,123,0.28)] hover:shadow-[0_5px_20px_rgba(0,0,0,0.45),0_0_32px_rgba(14,124,123,0.42)] transition-all"
                        >
                          <span className="text-[15px]">✓</span>
                          Approve & Post
                        </button>
                        <button
                          onClick={() => handleEditDraftOpen(item)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.045)] border-2 border-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.72)] font-semibold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.9)] hover:border-[rgba(255,255,255,0.28)] transition-all"
                        >
                          <span className="text-[15px]">✎</span>
                          Edit Draft
                        </button>
                        <button
                          onClick={() => {
                            void handleHitlAction(item.id, 'rejectHitl');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-[rgba(180,30,30,0.38)] to-[rgba(100,10,10,0.5)] border-2 border-[rgba(255,80,80,0.35)] text-[rgba(255,120,120,0.98)] font-bold text-[13px] tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.4),0_0_20px_rgba(180,30,30,0.22)] hover:shadow-[0_5px_20px_rgba(0,0,0,0.45),0_0_30px_rgba(180,30,30,0.38)] transition-all"
                        >
                          <span className="text-[15px]">✗</span>
                          Reject
                        </button>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">◉ 53</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">000,000</span> total posts
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">700K</span> ✧ / day
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">0100</span> user IDs
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,210,100,0.85)]">p.{hitlQueueItems.length}</span> HITL pending
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">(Timeline: Lifetime 100 / Y1: Current Cycle FY26 → deploy Q2:q-FY27 → TTM ago → Strategic Refresh)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── EDIT DRAFT MODAL ─────────────────────────────────────── */}
            {editDraftItem && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] backdrop-blur-sm"
                onClick={(e) => { if (e.target === e.currentTarget) setEditDraftItem(null); }}
              >
                <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-[rgba(201,168,76,0.35)] bg-[rgba(14,18,26,0.97)] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(201,168,76,0.12)] p-6">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,210,100,0.7)] uppercase mb-1">
                        ✎ Edit Draft · HITL Gate
                      </div>
                      <div className="font-[Rajdhani] text-[16px] font-bold text-[rgba(255,255,255,0.9)]">
                        {editDraftItem.subreddit}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditDraftItem(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.1)] transition-all font-bold text-[14px]"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Title Field */}
                  <div className="mb-4">
                    <label className="block font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.4)] uppercase mb-1.5">
                      Post Title
                    </label>
                    <input
                      type="text"
                      value={editDraftTitle}
                      onChange={(e) => setEditDraftTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.88)] font-[Rajdhani] text-[14px] focus:outline-none focus:border-[rgba(201,168,76,0.55)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)] transition-all"
                      placeholder="Post title..."
                    />
                  </div>

                  {/* Content Field */}
                  <div className="mb-5">
                    <label className="block font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.4)] uppercase mb-1.5">
                      Draft Content
                    </label>
                    <textarea
                      value={editDraftContent}
                      onChange={(e) => setEditDraftContent(e.target.value)}
                      rows={7}
                      className="w-full px-3.5 py-3 rounded-lg bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.82)] font-[Rajdhani] text-[13.5px] leading-relaxed resize-none focus:outline-none focus:border-[rgba(201,168,76,0.55)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)] transition-all"
                      placeholder="Edit the post draft..."
                    />
                    <div className="mt-1 text-right font-mono text-[9px] text-[rgba(255,255,255,0.28)]">
                      {editDraftContent.length} chars
                    </div>
                  </div>

                  {/* HITL reminder */}
                  <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.22)] flex items-center gap-2.5">
                    <span className="text-[rgba(255,210,100,0.9)] text-[13px]">⚠</span>
                    <span className="font-mono text-[9px] text-[rgba(255,210,100,0.72)] tracking-wide">
                      inv-001 · Saving returns draft to queue. Post still requires Approve & Post to go live.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditDraftItem(null)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.52)] font-semibold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.08)] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { void handleEditDraftSave(); }}
                      disabled={editDraftSaving}
                      className="flex-2 px-6 py-2.5 rounded-lg bg-gradient-to-br from-[rgba(201,168,76,0.55)] to-[rgba(150,110,20,0.65)] border-2 border-[rgba(201,168,76,0.55)] text-[rgba(255,240,180,1)] font-bold text-[13px] tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.4),0_0_22px_rgba(201,168,76,0.22)] hover:shadow-[0_5px_20px_rgba(0,0,0,0.45),0_0_32px_rgba(201,168,76,0.35)] disabled:opacity-50 transition-all"
                    >
                      {editDraftSaving ? 'Saving…' : '✓ Save Draft'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS TAB CONTENT - Updated */}
            {activeTab === 'agents' && activeAgentsLever === 'all' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    All Agents
                  </div>
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => { setAgentFilterStatus('all'); setShowAllAgents(false); }}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[9px] shadow-[0_0_12px_rgba(0,0,0,0.15)] transition-colors ${
                        agentFilterStatus === 'all'
                          ? 'border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.92)]'
                          : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.52)] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}>
                      {agentCards.length} All
                    </button>
                    <button 
                      onClick={() => { setAgentFilterStatus('running'); setShowAllAgents(false); }}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[9px] shadow-[0_0_18px_rgba(14,124,123,0.15)] transition-colors ${
                        agentFilterStatus === 'running'
                          ? 'border-[rgba(14,124,123,0.55)] bg-[rgba(14,124,123,0.25)] text-[rgba(14,200,198,0.95)]'
                          : 'border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] text-[rgba(14,200,198,0.92)] hover:bg-[rgba(14,124,123,0.18)]'
                      }`}>
                      {agentCards.filter(a => a.status === 'running').length} Running
                    </button>
                    <button 
                      onClick={() => { setAgentFilterStatus('hitl'); setShowAllAgents(false); }}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[9px] shadow-[0_0_18px_rgba(201,168,76,0.15)] transition-colors ${
                        agentFilterStatus === 'hitl'
                          ? 'border-[rgba(201,168,76,0.55)] bg-[rgba(201,168,76,0.25)] text-[rgba(255,210,100,0.95)]'
                          : 'border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] text-[rgba(255,210,100,0.92)] hover:bg-[rgba(201,168,76,0.18)]'
                      }`}>
                      {agentCards.filter(a => a.status === 'hitl').length} HITL Gated
                    </button>
                    <button 
                      onClick={() => { setAgentFilterStatus('idle'); setShowAllAgents(false); }}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[9px] shadow-[0_0_12px_rgba(0,0,0,0.15)] transition-colors ${
                        agentFilterStatus === 'idle'
                          ? 'border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.92)]'
                          : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.52)] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}>
                      {agentCards.filter(a => a.status === 'idle').length} Idle
                    </button>
                  </div>
                </div>

                {/* Agent Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {displayedAgents.map((agent) => (
                    <GlassCard key={agent.id} className="p-5 border-[rgba(255,255,255,0.08)]">
                      {/* Agent Header */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{agent.icon}</div>
                          <div>
                            <div className="font-[Rajdhani] text-[15px] font-bold text-[rgba(255,255,255,0.92)] leading-tight">
                              {agent.name}
                            </div>
                          </div>
                        </div>
                        <span
                          className={[
                            'inline-flex items-center justify-center rounded-full border px-3 py-1 font-mono text-[8.5px] font-medium leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                            agent.status === 'running'
                              ? 'border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.14)] text-[rgba(14,200,198,0.94)] shadow-[0_0_14px_rgba(14,124,123,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : agent.status === 'hitl'
                              ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.14)] text-[rgba(255,210,100,0.94)] shadow-[0_0_14px_rgba(201,168,76,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'border-[rgba(120,120,140,0.35)] bg-[rgba(120,120,140,0.1)] text-[rgba(180,180,200,0.86)] shadow-[0_0_12px_rgba(120,120,140,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]',
                          ].join(' ')}
                        >
                          {agent.status === 'running' ? 'RUNNING' : agent.status === 'hitl' ? 'HITL ⚠' : 'IDLE'}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="mb-4 font-mono text-[10px] leading-relaxed text-[rgba(255,255,255,0.48)] uppercase tracking-wide">
                        {agent.description}
                      </div>

                      {/* Fairness Score */}
                      {agent.status !== 'hitl' && (
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-mono text-[9px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">
                              Fairness Score
                            </span>
                            <span className="font-mono text-[11px] font-bold text-[rgba(14,200,198,0.92)]">
                              {agent.fairnessScore}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(0,0,0,0.4)]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[rgba(14,124,123,0.75)] to-[rgba(14,200,198,0.9)] shadow-[0_0_8px_rgba(14,200,198,0.4)]"
                              style={{ width: `${agent.fairnessScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3">
                        <span className="font-mono text-[9px] text-[rgba(255,255,255,0.4)]">
                          Model: <span className="text-[rgba(14,200,198,0.8)]">{agent.model}</span>
                        </span>
                        <span className="font-mono text-[9px] text-[rgba(255,255,255,0.35)]">
                          {agent.timestamp}
                        </span>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Showing Info */}
                <div className="mb-4 text-center">
                  <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] flex items-center justify-center gap-1">
                    {agentFilterStatus === 'all' && (
                      <>
                        <span>Showing {displayedAgents.length} of {filteredAgents.length} agents</span>
                        {hasMoreAgents && (
                          <>
                            <span>·</span>
                            <button 
                              onClick={() => setShowAllAgents(!showAllAgents)}
                              className="px-2 py-1 rounded bg-[rgba(14,200,198,0.15)] text-[rgba(14,200,198,0.9)] hover:bg-[rgba(14,200,198,0.25)] hover:text-[rgba(14,200,198,0.95)] transition-all font-semibold text-[9px] border border-[rgba(14,200,198,0.3)] hover:border-[rgba(14,200,198,0.5)]"
                            >
                              {showAllAgents ? '← Show Less' : 'View all →'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {agentFilterStatus !== 'all' && (
                      <>
                        <span>Showing {displayedAgents.length} {agentFilterStatus} agent{displayedAgents.length !== 1 ? 's' : ''}</span>
                        {hasMoreAgents && (
                          <>
                            <span>·</span>
                            <button 
                              onClick={() => setShowAllAgents(!showAllAgents)}
                              className="px-2 py-1 rounded bg-[rgba(14,200,198,0.15)] text-[rgba(14,200,198,0.9)] hover:bg-[rgba(14,200,198,0.25)] hover:text-[rgba(14,200,198,0.95)] transition-all font-semibold text-[9px] border border-[rgba(14,200,198,0.3)] hover:border-[rgba(14,200,198,0.5)]"
                            >
                              {showAllAgents ? '← Show Less' : 'View all →'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">◉ {agentCards.filter(a => a.status === 'running').length}</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">{testsPassedLabel}</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">TEVV {tevvScore.toFixed(1)} /100</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">BIAS gate &gt;70</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,210,100,0.85)]">▲ {hitlQueueItems.length}</span> HITL pending
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS TAB - RUNNING SECTION */}
            {activeTab === 'agents' && activeAgentsLever === 'running' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Currently Running
                  </div>
                  <div className="flex gap-2.5">
                    <button className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)] hover:bg-[rgba(14,124,123,0.18)] transition-colors"
                      style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' } : undefined}>
                      {runningAgents.length} Active
                    </button>
                  </div>
                </div>

                {/* Empty State or Running Agents List */}
                {runningAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-8">
                    <div className="text-5xl mb-4"
                      style={isLightTheme ? { filter: 'grayscale(1) brightness(0.4)' } : undefined}>⏸</div>
                    <div className="font-mono text-[13px] font-semibold text-[rgba(255,255,255,0.48)] text-center mb-2"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      No Agents Running
                    </div>
                    <div className="font-mono text-[11px] text-[rgba(255,255,255,0.34)] text-center max-w-md"
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                      Autopilot is idle. Click "Run Autopilot" in the Autopilot tab to start the 11-task orchestration pipeline.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Running Agents List */}
                    <div className="space-y-3 mb-6">
                      {runningAgents.map((agent) => (
                    <GlassCard key={agent.id} className="px-5 py-4 border-[rgba(255,255,255,0.08)] bg-[rgba(0,8,20,0.6)]"
                      style={isLightTheme ? { background: 'rgba(185,156,190,0.08)', borderColor: 'rgba(164,131,174,0.2)' } : undefined}>
                      <div className="flex items-center gap-5">
                        {/* Circular Progress Indicator */}
                        <div className="relative flex-shrink-0">
                          <svg className="w-16 h-16 transform -rotate-90">
                            {/* Background Circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="rgba(0,0,0,0.4)"
                              strokeWidth="4"
                            />
                            {/* Progress Circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke="rgba(14,200,198,0.85)"
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - agent.progress / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                              style={{
                                filter: 'drop-shadow(0 0 8px rgba(14,200,198,0.35))',
                              }}
                            />
                          </svg>
                          {/* Percentage Text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-mono text-[13px] font-bold text-[rgba(14,200,198,0.95)]">
                              {agent.icon}
                            </span>
                          </div>
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-[Rajdhani] text-[15px] font-bold text-[rgba(255,255,255,0.92)] mb-1.5 leading-tight"
                            style={isLightTheme ? { color: '#6B4F72' } : undefined}>
                            {agent.name}
                          </div>
                          <div className="font-mono text-[10px] leading-relaxed text-[rgba(255,255,255,0.48)] pr-4"
                            style={isLightTheme ? { color: '#A483AE' } : undefined}>
                            {agent.taskDescription}
                          </div>
                        </div>

                        {/* Running Time Button */}
                        <div className="flex-shrink-0">
                          <button className="rounded-full border border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.14)] px-4 py-2 font-mono text-[9px] font-medium text-[rgba(14,200,198,0.94)] shadow-[0_0_14px_rgba(14,124,123,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(14,124,123,0.2)] transition-colors whitespace-nowrap"
                            style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' } : undefined}>
                            RUNNING - {agent.runningTime}
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]"
                  style={isLightTheme ? { background: 'rgba(185,156,190,0.1)', borderColor: 'rgba(164,131,174,0.18)' } : undefined}>
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide"
                    style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                    <span className="text-[rgba(14,200,198,0.75)]"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>◉ {runningAgents.length}</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                      style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                    <span className="text-[rgba(14,200,198,0.75)]"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>{testsPassedLabel}</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                      style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                    <span className="text-[rgba(14,200,198,0.75)]"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>TEVV {tevvScore.toFixed(1)} /100</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                      style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                    <span className="text-[rgba(14,200,198,0.75)]"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>BIAS gate &gt;70</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                      style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                    <span className="text-[rgba(255,210,100,0.85)]"
                      style={isLightTheme ? { color: '#9A6FA8' } : undefined}>▲ {hitlQueueItems.length}</span> HITL pending
                  </div>
                </div>
                  </>
                )}
              </div>
            )}

            {/* AGENTS TAB - SCHEDULED SECTION */}
            {activeTab === 'agents' && activeAgentsLever === 'scheduled' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className={`font-mono text-[9px] tracking-[3px] uppercase ${
                    isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.34)]'
                  }`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                    Scheduled Runs
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      className={[
                        'rounded-full border px-3 py-1.5 font-mono text-[9px] transition-colors',
                        isLightTheme
                          ? 'border-[rgba(185,156,190,0.48)] bg-[rgba(255,255,255,0.78)] text-[#B99CBE] shadow-[0_8px_18px_rgba(142,99,142,0.14)] hover:bg-[rgba(255,255,255,0.9)]'
                          : 'border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)] hover:bg-[rgba(14,124,123,0.18)]',
                      ].join(' ')}
                      style={isLightTheme ? { color: '#B99CBE', borderColor: 'rgba(185,156,190,0.48)' } : undefined}
                    >
                      Next: {nextRunUtcLabel} UTC
                    </button>
                  </div>
                </div>

                {/* Scheduled Agents Table */}
                <div
                  className={[
                    'mb-6 overflow-hidden rounded-lg border',
                    isLightTheme
                      ? 'border-[rgba(147,104,149,0.24)] bg-[linear-gradient(165deg,rgba(255,255,255,0.82),rgba(246,236,245,0.9))] shadow-[0_16px_34px_rgba(147,104,149,0.12)]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(0,8,20,0.6)]',
                  ].join(' ')}
                >
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                      <col className="w-[30%]" />
                    </colgroup>
                    <thead>
                      <tr className={isLightTheme ? 'border-b border-[rgba(147,104,149,0.14)]' : 'border-b border-[rgba(255,255,255,0.06)]'}>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Name
                        </th>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Schedule
                        </th>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Next Run
                        </th>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Model
                        </th>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Est. Duration
                        </th>
                        <th className={`px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledAgents.map((agent) => (
                        <tr
                          key={agent.id}
                          className={[
                            'border-b transition-colors',
                            isLightTheme
                              ? 'border-[rgba(147,104,149,0.11)] hover:bg-[rgba(255,255,255,0.46)]'
                              : 'border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]',
                          ].join(' ')}
                        >
                          <td className="px-5 py-3.5">
                            <div className={`font-[Rajdhani] text-[14px] font-semibold ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(255,255,255,0.88)]'}`} style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                              {agent.name}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className={`font-mono text-[11px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.52)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                              {agent.schedule}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className={`font-mono text-[11px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.85)]'}`} style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                              {agent.nextRun}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className={`font-mono text-[11px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'}`} style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                              {agent.model}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className={`font-mono text-[11px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.48)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                              {agent.estDuration}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              className={[
                                'rounded-full border px-3 py-1.5 font-mono text-[9px] font-medium transition-colors',
                                agent.status === 'hitl'
                                  ? isLightTheme
                                    ? 'border-[rgba(196,160,74,0.42)] bg-[rgba(255,246,214,0.9)] text-[#A483AE] shadow-[0_6px_16px_rgba(190,154,66,0.16)] hover:bg-[rgba(255,241,195,0.95)]'
                                    : 'border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.14)] text-[rgba(255,210,100,0.92)] shadow-[0_0_14px_rgba(201,168,76,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(201,168,76,0.2)]'
                                  : agent.status === 'running'
                                    ? isLightTheme
                                      ? 'border-[rgba(185,156,190,0.5)] bg-[rgba(248,233,245,0.92)] text-[#A483AE] shadow-[0_6px_16px_rgba(147,104,149,0.14)] hover:bg-[rgba(244,221,239,0.96)]'
                                      : 'border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.16)] text-[rgba(14,200,198,0.95)] shadow-[0_0_14px_rgba(14,124,123,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(14,124,123,0.22)]'
                                    : agent.status === 'success'
                                      ? isLightTheme
                                        ? 'border-[rgba(185,156,190,0.46)] bg-[rgba(241,232,245,0.9)] text-[#A483AE] shadow-[0_6px_16px_rgba(135,98,141,0.14)] hover:bg-[rgba(235,224,241,0.96)]'
                                        : 'border-[rgba(30,165,80,0.38)] bg-[rgba(30,120,60,0.16)] text-[rgba(120,255,170,0.92)] shadow-[0_0_14px_rgba(30,120,60,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(30,120,60,0.22)]'
                                      : agent.status === 'failed'
                                        ? 'border-[rgba(255,90,90,0.35)] bg-[rgba(170,40,40,0.16)] text-[rgba(255,160,160,0.92)] shadow-[0_0_14px_rgba(170,40,40,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(170,40,40,0.22)]'
                                        : agent.status === 'skipped'
                                          ? isLightTheme
                                            ? 'border-[rgba(185,156,190,0.38)] bg-[rgba(244,240,248,0.9)] text-[#B99CBE] shadow-[0_6px_14px_rgba(124,108,140,0.12)] hover:bg-[rgba(238,232,245,0.95)]'
                                            : 'border-[rgba(160,160,170,0.35)] bg-[rgba(90,90,110,0.18)] text-[rgba(220,220,230,0.88)] shadow-[0_0_14px_rgba(90,90,110,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(90,90,110,0.24)]'
                                          : isLightTheme
                                            ? 'border-[rgba(185,156,190,0.48)] bg-[rgba(246,233,244,0.92)] text-[#A483AE] shadow-[0_6px_16px_rgba(147,104,149,0.14)] hover:bg-[rgba(240,222,236,0.95)]'
                                            : 'border-[rgba(100,50,180,0.35)] bg-[rgba(100,50,180,0.14)] text-[rgba(180,140,255,0.92)] shadow-[0_0_14px_rgba(100,50,180,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(100,50,180,0.2)]',
                              ].join(' ')}
                              style={isLightTheme ? { color: '#8F6B97' } : undefined}
                            >
                              {agent.status === 'hitl'
                                ? 'HITL Gate'
                                : agent.status === 'running'
                                  ? 'Running'
                                  : agent.status === 'success'
                                    ? 'Success'
                                    : agent.status === 'failed'
                                      ? 'Failed'
                                      : agent.status === 'skipped'
                                        ? 'Skipped'
                                        : 'Scheduled'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Stats Bar */}
                <div
                  className={[
                    'mt-6 px-4 py-3 rounded-lg border',
                    isLightTheme
                      ? 'bg-[rgba(255,255,255,0.65)] border-[rgba(147,104,149,0.2)] shadow-[0_10px_22px_rgba(147,104,149,0.1)]'
                      : 'bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.06)]',
                  ].join(' ')}
                >
                  <div className={`font-mono text-[9px] tracking-wide ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.35)]'}`} style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                    <span className={isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'} style={isLightTheme ? { color: '#8F6B97' } : undefined}>◉ {runningAgents.length}</span> agents running
                    <span className={`mx-2 ${isLightTheme ? 'text-[rgba(120,90,132,0.3)]' : 'text-[rgba(255,255,255,0.15)]'}`}>|</span>
                    <span className={isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'} style={isLightTheme ? { color: '#8F6B97' } : undefined}>{testsPassedLabel}</span>
                    <span className={`mx-2 ${isLightTheme ? 'text-[rgba(120,90,132,0.3)]' : 'text-[rgba(255,255,255,0.15)]'}`}>|</span>
                    <span className={isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'} style={isLightTheme ? { color: '#8F6B97' } : undefined}>TEVV {tevvScore.toFixed(1)} /100</span>
                    <span className={`mx-2 ${isLightTheme ? 'text-[rgba(120,90,132,0.3)]' : 'text-[rgba(255,255,255,0.15)]'}`}>|</span>
                    <span className={isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'} style={isLightTheme ? { color: '#8F6B97' } : undefined}>BIAS gate &gt;70</span>
                    <span className={`mx-2 ${isLightTheme ? 'text-[rgba(120,90,132,0.3)]' : 'text-[rgba(255,255,255,0.15)]'}`}>|</span>
                    <span className={isLightTheme ? 'text-[rgba(168,131,43,0.88)]' : 'text-[rgba(255,210,100,0.85)]'}>▲ {hitlQueueItems.length}</span> HITL pending
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agents' && activeAgentsLever === 'campaigns' && (
              <div className="space-y-6">
                <GlassCard variant="teal" className="p-6">
                  <div className="mb-5">
                    <div
                      className={`font-mono text-[10px] tracking-[3px] uppercase mb-1 ${isLightTheme ? 'text-[#9A6FA8]' : 'text-[rgba(14,200,198,0.72)]'}`}
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}
                    >
                      Campaign Studio
                    </div>
                    <div className={`text-[20px] leading-tight font-semibold mb-2 ${isLightTheme ? 'text-[#6B4F72]' : 'text-[rgba(232,244,255,0.92)]'}`}>
                      Deep SEO Campaign
                    </div>
                    <div
                      className={`text-[13px] leading-relaxed ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(200,225,245,0.58)]'}`}
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}
                    >
                      Run a 5-agent SEO chain: keyword research → content generation → audit → backlinks → knowledge base.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Keyword Researcher', 'Geo Content Generator', 'SEO Auditor', 'Backlink Outreach', 'KB Curator'].map(agent => (
                        <span
                          key={agent}
                          className={`rounded-full border px-2.5 py-1 font-mono text-[8px] tracking-[1px] uppercase ${isLightTheme ? 'border-[rgba(164,131,174,0.32)] bg-[rgba(255,255,255,0.55)] text-[#8F6B97]' : 'border-[rgba(14,200,198,0.26)] bg-[rgba(14,124,123,0.12)] text-[rgba(170,230,228,0.88)]'}`}
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <label className="block">
                      <div className={`font-mono text-[9px] uppercase mb-1.5 tracking-[2px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(255,255,255,0.45)]'}`} style={isLightTheme ? { color: '#A483AE' } : undefined}>Site URL</div>
                      <input
                        value={a2aSiteUrl}
                        onChange={event => setA2aSiteUrl(event.target.value)}
                        placeholder="https://example.com"
                        className={[
                          'w-full rounded-lg border px-3 py-2 font-mono text-[12px] focus:outline-none',
                          isLightTheme
                            ? 'a2a-campaign-input border-[rgba(185,156,190,0.3)] bg-[rgba(255,255,255,0.7)] text-[#8F6B97] placeholder:text-[#C7B2CD] focus:border-[rgba(164,131,174,0.68)]'
                            : 'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-[rgba(235,247,255,0.92)] placeholder:text-[rgba(180,205,220,0.45)] focus:border-[rgba(14,200,198,0.55)]',
                        ].join(' ')}
                        style={isLightTheme ? { color: '#8F6B97' } : undefined}
                      />
                      <div className={`mt-1 font-mono text-[8px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.45)]'}`}>
                        Enter canonical root URL (example: https://example.com)
                      </div>
                    </label>
                    <label className="block">
                      <div className={`font-mono text-[9px] uppercase mb-1.5 tracking-[2px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(255,255,255,0.45)]'}`} style={isLightTheme ? { color: '#A483AE' } : undefined}>Target Keywords (comma-separated)</div>
                      <input
                        value={a2aKeywordsInput}
                        onChange={event => setA2aKeywordsInput(event.target.value)}
                        placeholder="ai marketing automation, seo platform"
                        className={[
                          'w-full rounded-lg border px-3 py-2 font-mono text-[12px] focus:outline-none',
                          isLightTheme
                            ? 'a2a-campaign-input border-[rgba(185,156,190,0.3)] bg-[rgba(255,255,255,0.7)] text-[#8F6B97] placeholder:text-[#C7B2CD] focus:border-[rgba(164,131,174,0.68)]'
                            : 'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-[rgba(235,247,255,0.92)] placeholder:text-[rgba(180,205,220,0.45)] focus:border-[rgba(14,200,198,0.55)]',
                        ].join(' ')}
                        style={isLightTheme ? { color: '#8F6B97' } : undefined}
                      />
                      <div className={`mt-1 font-mono text-[8px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.45)]'}`}>
                        Use 3-10 intent keywords for best clustering and page mapping.
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => { void handleLaunchDeepSeoCampaign(); }}
                      disabled={a2aLaunchLoading}
                      className={[
                        'px-6 py-2.5 rounded-full border font-bold text-[12px] tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                        isLightTheme
                          ? 'bg-gradient-to-br from-[rgba(189,137,183,0.88)] to-[rgba(143,107,151,0.92)] border-[rgba(185,156,190,0.65)] text-[rgba(255,245,255,0.98)] shadow-[0_8px_20px_rgba(147,104,149,0.26)] hover:shadow-[0_10px_24px_rgba(147,104,149,0.34)]'
                          : 'bg-gradient-to-br from-[rgba(14,124,123,0.72)] to-[rgba(0,60,60,0.8)] border-[rgba(14,200,198,0.42)] text-[rgba(14,200,198,1)] shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_24px_rgba(14,124,123,0.3)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.45),0_0_35px_rgba(14,124,123,0.5)]',
                      ].join(' ')}
                      style={
                        isLightTheme
                          ? {
                              color: '#5F3F67',
                              borderColor: 'rgba(164,131,174,0.62)',
                              background: 'linear-gradient(135deg, rgba(214,174,208,0.92), rgba(177,136,183,0.92))',
                            }
                          : undefined
                      }
                    >
                      {a2aLaunchLoading ? 'Launching…' : '▶ Launch Campaign'}
                    </button>
                    <div className={`font-mono text-[9px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.45)]'}`}>
                      {a2aSessionId ? (
                        <>Session: <span className={isLightTheme ? 'text-[#8F6B97]' : 'text-[rgba(14,200,198,0.88)]'}>{a2aSessionId}</span></>
                      ) : (
                        <>Tip: use Campaign History toggle to load previous sessions.</>
                      )}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`font-mono text-[9px] uppercase tracking-[2px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.75)]'}`}>
                        Campaign History
                      </div>
                      <div className={`font-mono text-[9px] mt-1 ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.45)]'}`}>
                        {campaignHistory.length} session{campaignHistory.length === 1 ? '' : 's'} stored locally.
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveAgentsLever('campaign-history')}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[1.2px] transition-all ${isLightTheme ? 'border-[rgba(164,131,174,0.45)] text-[#8F6B97] bg-[rgba(255,255,255,0.55)] hover:bg-[rgba(244,228,243,0.85)]' : 'border-[rgba(14,200,198,0.35)] text-[rgba(14,200,198,0.82)] bg-[rgba(14,124,123,0.14)] hover:bg-[rgba(14,124,123,0.22)]'}`}
                    >
                      Open History
                    </button>
                  </div>
                </GlassCard>

                {a2aError ? (
                  <GlassCard className="px-5 py-4 border-[rgba(255,90,90,0.3)] bg-[rgba(100,20,20,0.2)]">
                    <div className="font-mono text-[10px] text-[rgba(255,160,160,0.95)]">{a2aError}</div>
                  </GlassCard>
                ) : null}

                {a2aSessionStatus ? (
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`font-mono text-[10px] tracking-[2px] uppercase ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(255,255,255,0.4)]'}`}>Campaign Progress</div>
                      <div className="font-mono text-[9px] uppercase tracking-[1.5px] px-2.5 py-1 rounded-full border"
                        style={{
                          color: a2aSessionStatus === 'completed' ? 'rgba(14,200,198,0.95)' : a2aSessionStatus === 'failed' ? 'rgba(255,120,120,0.9)' : 'rgba(255,210,90,0.95)',
                          borderColor: a2aSessionStatus === 'completed' ? 'rgba(14,200,198,0.35)' : a2aSessionStatus === 'failed' ? 'rgba(255,90,90,0.35)' : 'rgba(201,168,76,0.45)',
                          background: a2aSessionStatus === 'completed' ? 'rgba(14,124,123,0.12)' : a2aSessionStatus === 'failed' ? 'rgba(120,30,30,0.2)' : 'rgba(55,38,0,0.18)',
                        }}
                      >
                        {a2aSessionStatus}
                      </div>
                    </div>

                    {a2aSteps.length > 0 ? (
                      <div className="space-y-3 mb-5">
                        {a2aSteps.map(step => {
                          const AGENT_LABELS: Record<string, string> = {
                            keyword_researcher: 'Keyword Researcher',
                            geo_content_generator: 'Geo Content Generator',
                            seo_auditor: 'SEO Auditor',
                            backlink_outreach: 'Backlink Outreach',
                            knowledge_base_curator: 'Knowledge Base Curator',
                          };
                          const AGENT_ICONS: Record<string, string> = {
                            keyword_researcher: '🔍',
                            geo_content_generator: '🌍',
                            seo_auditor: '📊',
                            backlink_outreach: '🔗',
                            knowledge_base_curator: '📚',
                          };
                          const label = AGENT_LABELS[step.agent] ?? step.agent.replace(/_/g, ' ');
                          const icon = AGENT_ICONS[step.agent] ?? '🤖';

                          // Parse output with resilience for fenced, escaped, or double-encoded JSON.
                          let parsed: Record<string, unknown> | null = null;
                          let readableOutput = '';
                          if (step.outputSummary) {
                            let raw = step.outputSummary.trim();
                            raw = raw.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

                            const normalizeEscapes = (value: string): string => value
                              .replace(/\\n/g, '\n')
                              .replace(/\\t/g, '\t')
                              .replace(/\\r/g, '')
                              .replace(/\\"/g, '"')
                              .trim();

                            const toObject = (value: unknown): Record<string, unknown> | null => (
                              value && typeof value === 'object' && !Array.isArray(value)
                                ? (value as Record<string, unknown>)
                                : null
                            );

                            const tryParse = (value: string): unknown => {
                              try {
                                return JSON.parse(value);
                              } catch {
                                return null;
                              }
                            };

                            let decoded: unknown = tryParse(raw);
                            if (typeof decoded === 'string') {
                              decoded = tryParse(decoded.trim()) ?? decoded;
                            }

                            parsed = toObject(decoded);

                            if (!parsed) {
                              const firstObjectBrace = raw.indexOf('{');
                              const lastObjectBrace = raw.lastIndexOf('}');
                              if (firstObjectBrace >= 0 && lastObjectBrace > firstObjectBrace) {
                                const extractedObject = raw.slice(firstObjectBrace, lastObjectBrace + 1);
                                const parsedObject = tryParse(extractedObject);
                                parsed = toObject(parsedObject);
                              }
                            }

                            if (!parsed) {
                              const firstArrayBracket = raw.indexOf('[');
                              const lastArrayBracket = raw.lastIndexOf(']');
                              if (firstArrayBracket >= 0 && lastArrayBracket > firstArrayBracket) {
                                const extractedArray = raw.slice(firstArrayBracket, lastArrayBracket + 1);
                                const parsedArray = tryParse(extractedArray);
                                if (Array.isArray(parsedArray)) {
                                  parsed = { items: parsedArray };
                                }
                              }
                            }

                            if (!parsed) {
                              readableOutput = normalizeEscapes(raw)
                                .replace(/^"|"$/g, '')
                                .replace(/\s{2,}/g, ' ')
                                .replace(/\n{3,}/g, '\n\n')
                                .trim();
                            }
                          }

                          const statusColor = step.status === 'success' ? 'rgba(14,200,198,0.9)' : step.status === 'failed' ? 'rgba(255,120,120,0.9)' : step.status === 'running' ? 'rgba(255,210,90,0.9)' : 'rgba(180,200,220,0.35)';
                          const statusBg = step.status === 'success' ? 'rgba(14,124,123,0.15)' : step.status === 'failed' ? 'rgba(120,30,30,0.2)' : step.status === 'running' ? 'rgba(55,38,0,0.18)' : 'rgba(255,255,255,0.04)';
                          const statusBorder = step.status === 'success' ? 'rgba(14,200,198,0.25)' : step.status === 'failed' ? 'rgba(255,90,90,0.3)' : step.status === 'running' ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)';
                          const statusIcon = step.status === 'running' ? '⟳' : step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : '·';

                          // ── Agent-specific structured output renderers ───────
                          const renderOutput = () => {
                            if (!parsed) {
                              if (!readableOutput) return null;
                              return (
                                <div className="px-4 pb-4">
                                  <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.16)] p-3.5">
                                    <div className="font-mono text-[7.5px] uppercase tracking-[1.4px] text-[rgba(255,255,255,0.36)] mb-2">Agent Output</div>
                                    <p className="text-[10px] text-[rgba(200,225,245,0.75)] leading-relaxed whitespace-pre-wrap break-words">
                                      {readableOutput}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            if (step.agent === 'keyword_researcher') {
                              const opps = (parsed.opportunities as Array<{keyword:string;currentPosition:number;searchVolume:number;difficulty:number;priority:string;contentBrief:string}>) ?? [];
                              const total = (parsed.totalOpportunities as number) ?? opps.length;
                              const gain = (parsed.estimatedMonthlyTrafficGain as number) ?? null;
                              return (
                                <div className="px-4 pb-4 space-y-4">
                                  <div className="flex gap-6">
                                    <div className="text-center"><div className="text-[20px] font-bold text-[rgba(14,200,198,0.95)]">{total}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">Opportunities</div></div>
                                    {gain ? <div className="text-center"><div className="text-[20px] font-bold text-[rgba(255,210,90,0.95)]">+{gain.toLocaleString()}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">Est. Monthly Visits</div></div> : null}
                                  </div>
                                  <div className="space-y-3.5">
                                    {opps.slice(0, 7).map((o, i) => (
                                      <div key={i} className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.15)] p-4 hover:border-[rgba(255,255,255,0.12)] transition-colors">
                                        <div className="flex items-start justify-between gap-3 mb-2.5">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-semibold text-[rgba(220,235,255,0.92)] mb-2">{o.keyword}</div>
                                            <div className="flex gap-3 flex-wrap">
                                              <span className="font-mono text-[8.5px] text-[rgba(180,200,220,0.65)]"><span className="text-[rgba(255,210,90,0.95)]">#{o.currentPosition}</span> position</span>
                                              <span className="font-mono text-[8.5px] text-[rgba(180,200,220,0.65)]"><span className="text-[rgba(14,200,198,0.85)]">{o.searchVolume?.toLocaleString()}</span> monthly</span>
                                              <span className="font-mono text-[8.5px] text-[rgba(180,200,220,0.65)]">KD <span className="text-[rgba(200,225,245,0.8)]">{o.difficulty}</span></span>
                                            </div>
                                          </div>
                                          <span className="font-mono text-[7.5px] uppercase tracking-[1.2px] px-2.5 py-1 rounded-full shrink-0" style={{ background: o.priority === 'high' ? 'rgba(14,124,123,0.35)' : 'rgba(80,60,0,0.35)', color: o.priority === 'high' ? 'rgba(14,200,198,0.95)' : 'rgba(255,210,90,0.9)' }}>{o.priority}</span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                                          <p className="text-[10px] text-[rgba(180,200,220,0.75)] leading-relaxed whitespace-pre-wrap">{o.contentBrief}</p>
                                        </div>
                                      </div>
                                    ))}
                                    {opps.length > 7 ? <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] text-center pt-2 pb-1">+{opps.length - 7} more keywords available</div> : null}
                                  </div>
                                </div>
                              );
                            }

                            if (step.agent === 'geo_content_generator') {
                              const regions = (parsed.regions as Array<{locale:string;city:string;headline:string;metaDescription:string;bodyExcerpt:string;targetKeyword:string}>) ?? [];
                              const total = (parsed.totalPages as number) ?? regions.length;
                              return (
                                <div className="px-4 pb-4 space-y-3.5">
                                  <div className="flex gap-4">
                                    <div className="text-center"><div className="text-[20px] font-bold text-[rgba(14,200,198,0.95)]">{total}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">Geo Pages</div></div>
                                  </div>
                                  <div className="space-y-3">
                                    {regions.slice(0, 5).map((r, i) => (
                                      <div key={i} className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.15)] p-3.5 hover:border-[rgba(255,255,255,0.12)] transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-[rgba(14,124,123,0.3)] text-[rgba(14,200,198,0.85)] uppercase">{r.locale}</span>
                                          <span className="text-[11px] font-semibold text-[rgba(220,235,255,0.9)]">{r.city}</span>
                                        </div>
                                        <div className="text-[10.5px] text-[rgba(200,225,245,0.85)] mb-2 font-medium leading-relaxed">{r.headline}</div>
                                        {r.metaDescription ? <p className="text-[9px] text-[rgba(160,185,210,0.65)] leading-relaxed mb-1.5">{r.metaDescription}</p> : null}
                                        {r.bodyExcerpt ? <p className="text-[9px] text-[rgba(180,200,220,0.6)] leading-relaxed italic bg-[rgba(255,255,255,0.02)] p-2 rounded">{r.bodyExcerpt}</p> : null}
                                      </div>
                                    ))}
                                    {regions.length > 5 ? <div className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] text-center pt-1">+{regions.length - 5} more pages</div> : null}
                                  </div>
                                </div>
                              );
                            }

                            if (step.agent === 'seo_auditor') {
                              const score = (parsed.overallScore as number) ?? null;
                              const cwv = parsed.coreWebVitals as {lcp_s?:number;fid_ms?:number;cls?:number;status?:string} | undefined;
                              const issues = (parsed.issues as Array<{type:string;page:string;severity:string;recommendation:string}>) ?? [];
                              const da = (parsed.domainAuthority as number) ?? null;
                              const scoreColor = score !== null ? (score >= 80 ? 'rgba(14,200,198,0.95)' : score >= 60 ? 'rgba(255,210,90,0.95)' : 'rgba(255,120,120,0.9)') : 'rgba(180,200,220,0.5)';
                              return (
                                <div className="px-4 pb-4 space-y-3.5">
                                  <div className="flex gap-6 items-end">
                                    {score !== null ? <div><div className="text-[28px] font-bold leading-none" style={{ color: scoreColor }}>{score}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">SEO Score</div></div> : null}
                                    {da !== null ? <div><div className="text-[20px] font-bold text-[rgba(200,180,255,0.9)]">{da}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px]">Domain Authority</div></div> : null}
                                    {cwv ? <div className="flex gap-3">
                                      {cwv.lcp_s !== undefined ? <div className="text-center"><div className="font-mono text-[12px] font-bold" style={{ color: cwv.lcp_s <= 2.5 ? 'rgba(14,200,198,0.9)' : 'rgba(255,210,90,0.9)' }}>{cwv.lcp_s}s</div><div className="font-mono text-[7px] text-[rgba(255,255,255,0.35)] uppercase">LCP</div></div> : null}
                                      {cwv.cls !== undefined ? <div className="text-center"><div className="font-mono text-[12px] font-bold" style={{ color: cwv.cls <= 0.1 ? 'rgba(14,200,198,0.9)' : 'rgba(255,210,90,0.9)' }}>{cwv.cls}</div><div className="font-mono text-[7px] text-[rgba(255,255,255,0.35)] uppercase">CLS</div></div> : null}
                                      {cwv.fid_ms !== undefined ? <div className="text-center"><div className="font-mono text-[12px] font-bold" style={{ color: cwv.fid_ms <= 100 ? 'rgba(14,200,198,0.9)' : 'rgba(255,210,90,0.9)' }}>{cwv.fid_ms}ms</div><div className="font-mono text-[7px] text-[rgba(255,255,255,0.35)] uppercase">FID</div></div> : null}
                                    </div> : null}
                                  </div>
                                  {issues.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="font-mono text-[8px] tracking-[2px] text-[rgba(255,255,255,0.4)] uppercase">Issues Found ({issues.length})</div>
                                      {issues.slice(0, 6).map((iss, i) => (
                                        <div key={i} className="rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)] p-3">
                                          <div className="flex gap-2 mb-1.5">
                                            <span className="font-mono text-[8px] px-2 py-0.5 rounded shrink-0 uppercase font-semibold" style={{ background: iss.severity === 'high' ? 'rgba(120,30,30,0.4)' : iss.severity === 'medium' ? 'rgba(80,55,0,0.4)' : 'rgba(30,50,80,0.4)', color: iss.severity === 'high' ? 'rgba(255,120,120,0.9)' : iss.severity === 'medium' ? 'rgba(255,210,90,0.9)' : 'rgba(100,180,255,0.8)' }}>{iss.severity}</span>
                                            <span className="font-mono text-[9px] text-[rgba(200,225,245,0.8)]">{iss.type?.replace(/_/g, ' ')}</span>
                                          </div>
                                          <div className="text-[9px] text-[rgba(160,185,210,0.65)] mb-1">{iss.page}</div>
                                          {iss.recommendation ? <div className="text-[9px] text-[rgba(180,200,220,0.7)] mt-1 leading-relaxed bg-[rgba(255,255,255,0.01)] p-1.5 rounded">{iss.recommendation}</div> : null}
                                        </div>
                                      ))}
                                      {issues.length > 6 ? <div className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] text-center pt-1">+{issues.length - 6} more issues</div> : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }

                            if (step.agent === 'backlink_outreach') {
                              const targets = (parsed.targets as Array<{domain:string;domainAuthority:number;emailSubject:string;emailBody:string;status:string}>) ?? [];
                              const drafted = (parsed.drafted as number) ?? targets.length;
                              const responseRate = (parsed.estimatedResponseRate as number) ?? null;
                              return (
                                <div className="px-4 pb-4 space-y-3.5">
                                  <div className="flex gap-5">
                                    <div className="text-center"><div className="text-[20px] font-bold text-[rgba(14,200,198,0.95)]">{drafted}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">Outreach Drafted</div></div>
                                    {responseRate ? <div className="text-center"><div className="text-[20px] font-bold text-[rgba(255,210,90,0.9)]">{Math.round(responseRate * 100)}%</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">Est. Response</div></div> : null}
                                  </div>
                                  <div className="space-y-3">
                                    {targets.slice(0, 5).map((t, i) => (
                                      <div key={i} className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.15)] p-3.5 hover:border-[rgba(255,255,255,0.12)] transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[11px] font-semibold text-[rgba(14,200,198,0.92)]">{t.domain}</span>
                                          <span className="font-mono text-[8.5px] text-[rgba(200,180,255,0.8)]">DA {t.domainAuthority}</span>
                                        </div>
                                        {t.emailSubject ? <div className="text-[10px] text-[rgba(220,235,255,0.82)] font-medium mb-2 leading-relaxed">"{t.emailSubject}"</div> : null}
                                        {t.emailBody ? <p className="text-[9.5px] text-[rgba(160,185,210,0.7)] leading-relaxed whitespace-pre-wrap bg-[rgba(255,255,255,0.01)] p-2.5 rounded">{t.emailBody}</p> : null}
                                      </div>
                                    ))}
                                    {targets.length > 5 ? <div className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] text-center pt-1">+{targets.length - 5} more targets</div> : null}
                                  </div>
                                </div>
                              );
                            }

                            if (step.agent === 'knowledge_base_curator') {
                              const entries = (parsed.entries as Array<{title:string;category:string;summary:string;tags:string[]}>) ?? [];
                              const total = (parsed.totalCreated as number) ?? entries.length;
                              return (
                                <div className="px-4 pb-4 space-y-3.5">
                                  <div className="text-center"><div className="text-[20px] font-bold text-[rgba(14,200,198,0.95)]">{total}</div><div className="font-mono text-[7.5px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mt-1">KB Entries</div></div>
                                  <div className="space-y-3">
                                    {entries.slice(0, 6).map((e, i) => (
                                      <div key={i} className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.15)] p-3.5 hover:border-[rgba(255,255,255,0.12)] transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-[rgba(80,40,120,0.3)] text-[rgba(180,140,255,0.85)] uppercase">{e.category?.replace(/_/g, ' ')}</span>
                                          <span className="text-[11px] text-[rgba(220,235,255,0.88)] font-semibold">{e.title}</span>
                                        </div>
                                        <p className="text-[9.5px] text-[rgba(180,200,220,0.7)] leading-relaxed mb-2">{e.summary}</p>
                                        {e.tags?.length ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            {e.tags.slice(0, 5).map((tag, ti) => (
                                              <span key={ti} className="font-mono text-[7.5px] px-2 py-0.5 rounded bg-[rgba(14,124,123,0.25)] text-[rgba(14,200,198,0.75)]">#{tag}</span>
                                            ))}
                                            {e.tags.length > 5 ? <span className="font-mono text-[7px] text-[rgba(255,255,255,0.4)]">+{e.tags.length - 5}</span> : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                    {entries.length > 6 ? <div className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] text-center pt-1">+{entries.length - 6} more entries</div> : null}
                                  </div>
                                </div>
                              );
                            }

                            // Generic fallback — key/value grid for unknown agents
                            const topLevelEntries = Object.entries(parsed).filter(([, v]) => typeof v !== 'object' || v === null).slice(0, 8);
                            if (topLevelEntries.length > 0) {
                              return (
                                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                                  {topLevelEntries.map(([k, v]) => (
                                    <div key={k} className="rounded-md bg-[rgba(0,0,0,0.2)] px-3 py-2">
                                      <div className="font-mono text-[8px] text-[rgba(255,255,255,0.35)] uppercase tracking-[1px] mb-0.5">{k.replace(/_/g, ' ')}</div>
                                      <div className="font-mono text-[11px] text-[rgba(200,225,245,0.82)]">{String(v)}</div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            return (
                              <div className="px-4 pb-4">
                                <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.16)] p-3.5">
                                  <div className="font-mono text-[7.5px] uppercase tracking-[1.4px] text-[rgba(255,255,255,0.36)] mb-2">Structured Output</div>
                                  <pre className="text-[9.5px] text-[rgba(200,225,245,0.72)] leading-relaxed whitespace-pre-wrap break-words font-mono">
                                    {JSON.stringify(parsed, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div key={step.id} className="rounded-xl border overflow-hidden" style={{ borderColor: statusBorder, background: statusBg }}>
                              {/* Step header */}
                              <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[14px]">{icon}</span>
                                  <div>
                                    <div className="text-[11.5px] text-[rgba(220,235,255,0.9)] font-semibold">{label}</div>
                                    {step.startedAt && step.finishedAt ? (
                                      <div className="font-mono text-[8px] text-[rgba(180,200,220,0.35)] mt-0.5">
                                        {Math.round((new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="font-mono text-[8.5px] uppercase tracking-[1.5px] flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ color: statusColor, borderColor: statusBorder }}>
                                  <span>{statusIcon}</span><span>{step.status}</span>
                                </div>
                              </div>
                              {/* Structured output */}
                              {parsed || step.outputSummary ? (
                                <div className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] pt-3">
                                  {renderOutput()}
                                </div>
                              ) : null}
                              {/* Error */}
                              {step.error ? (
                                <div className="border-t border-[rgba(255,90,90,0.2)] px-4 py-3 bg-[rgba(100,20,20,0.15)]">
                                  <div className="font-mono text-[8px] tracking-[2px] text-[rgba(255,120,120,0.6)] uppercase mb-1">Error</div>
                                  <div className="font-mono text-[9px] text-[rgba(255,160,160,0.85)] leading-relaxed">{step.error}</div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {a2aMessages.length > 0 ? (
                      <div>
                        <div className="font-mono text-[8.5px] tracking-[2px] text-[rgba(255,255,255,0.28)] uppercase mb-2">Agent Log</div>
                        <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.28)] p-3 max-h-[220px] overflow-y-auto space-y-1.5">
                          {a2aMessages.slice(-12).map(msg => (
                            <div key={msg.id} className="font-mono text-[9.5px] text-[rgba(210,228,248,0.65)] leading-relaxed">
                              <span className="text-[rgba(14,200,198,0.75)]">[{msg.role}{msg.agent ? `:${msg.agent}` : ''}]</span>{' '}{msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </GlassCard>
                ) : null}
              </div>
            )}

            {activeTab === 'agents' && activeAgentsLever === 'campaign-history' && (
              <div className="space-y-5">
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <div className={`font-mono text-[10px] tracking-[2.4px] uppercase ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.78)]'}`}>
                        Campaign History
                      </div>
                      <div className={`mt-1 text-[12px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(200,225,245,0.58)]'}`}>
                        Review previous Deep SEO sessions and load any run back into Campaign progress.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full px-3 py-1 border font-mono text-[8px] uppercase tracking-[1.2px] ${isLightTheme ? 'border-[rgba(164,131,174,0.35)] text-[#8F6B97] bg-[rgba(255,255,255,0.6)]' : 'border-[rgba(14,200,198,0.3)] text-[rgba(14,200,198,0.8)] bg-[rgba(14,124,123,0.12)]'}`}>
                        {campaignHistory.length} stored
                      </div>
                      {campaignHistory.length > 0 ? (
                        <button
                          onClick={handleClearCampaignHistory}
                          className={`rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[1.1px] transition-all ${isLightTheme ? 'border-[rgba(185,156,190,0.45)] text-[#8F6B97] hover:bg-[rgba(244,228,243,0.82)]' : 'border-[rgba(255,90,90,0.28)] text-[rgba(255,150,150,0.86)] hover:bg-[rgba(110,30,30,0.2)]'}`}
                        >
                          Clear History
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {campaignHistory.length === 0 ? (
                    <div className={`rounded-xl border px-4 py-5 text-center ${isLightTheme ? 'border-[rgba(185,156,190,0.24)] bg-[rgba(255,255,255,0.45)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]'}`}>
                      <div className={`font-mono text-[10px] uppercase tracking-[2px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(255,255,255,0.44)]'}`}>
                        No Campaign History Yet
                      </div>
                      <div className={`mt-2 font-mono text-[9px] ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.45)]'}`}>
                        Launch a Deep SEO Campaign to create your first tracked session.
                      </div>
                      <button
                        onClick={() => setActiveAgentsLever('campaigns')}
                        className={`mt-3 rounded-full border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[1.1px] transition-all ${isLightTheme ? 'border-[rgba(164,131,174,0.45)] text-[#8F6B97] hover:bg-[rgba(244,228,243,0.82)]' : 'border-[rgba(14,200,198,0.32)] text-[rgba(14,200,198,0.82)] hover:bg-[rgba(14,124,123,0.2)]'}`}
                      >
                        Go To Campaigns
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {campaignHistory.map(entry => {
                        const isActive = entry.sessionId === a2aSessionId;
                        const statusColor =
                          entry.status === 'completed' ? 'rgba(14,200,198,0.9)'
                          : entry.status === 'failed' ? 'rgba(255,120,120,0.9)'
                          : 'rgba(255,210,90,0.9)';

                        return (
                          <div
                            key={entry.sessionId}
                            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${isActive
                              ? (isLightTheme ? 'border-[rgba(185,156,190,0.45)] bg-[rgba(245,232,244,0.8)]' : 'border-[rgba(14,200,198,0.35)] bg-[rgba(14,124,123,0.1)]')
                              : (isLightTheme ? 'border-[rgba(185,156,190,0.22)] bg-[rgba(255,255,255,0.45)]' : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]')}`}
                          >
                            <div className="flex-1 min-w-[220px]">
                              <div className={`font-mono text-[10.5px] truncate ${isLightTheme ? 'text-[#8F6B97]' : 'text-[rgba(220,235,255,0.86)]'}`}>
                                {entry.siteUrl}
                              </div>
                              <div className={`font-mono text-[9px] truncate mt-0.5 ${isLightTheme ? 'text-[#B99CBE]' : 'text-[rgba(180,200,220,0.5)]'}`}>
                                {entry.keywords}
                              </div>
                              <div className={`font-mono text-[8px] mt-1 ${isLightTheme ? 'text-[rgba(155,126,166,0.74)]' : 'text-[rgba(180,200,220,0.32)]'}`}>
                                {new Date(entry.launchedAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="font-mono text-[8.5px] uppercase tracking-[1px]" style={{ color: statusColor }}>{entry.status}</div>
                              {!isActive ? (
                                <button
                                  onClick={() => { void handleLoadCampaignSession(entry); }}
                                  className={`font-mono text-[8px] uppercase tracking-[1px] px-2.5 py-1.5 rounded border transition-colors ${isLightTheme ? 'border-[rgba(185,156,190,0.45)] text-[#8F6B97] hover:bg-[rgba(244,228,243,0.82)]' : 'border-[rgba(14,200,198,0.3)] text-[rgba(14,200,198,0.78)] hover:bg-[rgba(14,124,123,0.2)]'}`}
                                >
                                  Load Session
                                </button>
                              ) : (
                                <div className={`font-mono text-[8px] uppercase tracking-[1px] ${isLightTheme ? 'text-[#A483AE]' : 'text-[rgba(14,200,198,0.55)]'}`}>Active</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'traffic' && (
              <div>
                {!isAnalyticsTrafficLoading && (analyticsChannels.length === 0 || analyticsTopPages.length === 0) ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]">
                      Analytics data is currently unavailable for this section.
                    </div>
                  </GlassCard>
                ) : null}

                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4 mb-4">
                  <GlassCard className="px-5 py-4 border-[rgba(14,124,123,0.32)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)]">
                        Site Traffic · 30 Days
                      </div>
                      <div className="px-2 py-[3px] rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] font-mono text-[8px] text-[rgba(14,200,198,0.88)]">
                        {trafficKpis.momLabel}
                      </div>
                    </div>

                    <div className="h-[112px]">
                      {isAnalyticsTrafficLoading ? (
                        <Skeleton className="h-full w-full rounded-lg" />
                      ) : (
                        <svg viewBox="0 0 760 120" className="w-full h-full">
                          <defs>
                            <linearGradient id="analyticsTrafficFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(14,200,198,0.24)" />
                              <stop offset="100%" stopColor="rgba(14,124,123,0)" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="88" x2="760" y2="88" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                          <path
                            d="M18 74 L102 56 L148 59 L210 45 L278 51 L336 38 L392 36 L448 30 L522 28 L584 24 L646 21 L742 18 L742 112 L18 112 Z"
                            fill="url(#analyticsTrafficFill)"
                          />
                          <path
                            d="M18 74 L102 56 L148 59 L210 45 L278 51 L336 38 L392 36 L448 30 L522 28 L584 24 L646 21 L742 18"
                            fill="none"
                            stroke="rgba(14,200,198,0.92)"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                      <div>
                        {isAnalyticsTrafficLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <div className="font-display text-[29px] leading-none text-[rgba(14,200,198,0.95)]">{trafficKpis.visitors}</div>
                        )}
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Visitors</div>
                      </div>
                      <div>
                        {isAnalyticsTrafficLoading ? (
                          <Skeleton className="h-8 w-12" />
                        ) : (
                          <div className="font-display text-[29px] leading-none text-[rgba(255,255,255,0.86)]">{trafficKpis.pagesPerSession}</div>
                        )}
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Pages/Session</div>
                      </div>
                      <div>
                        {isAnalyticsTrafficLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <div className="font-display text-[29px] leading-none text-[rgba(255,255,255,0.86)]">{trafficKpis.avgDuration}</div>
                        )}
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Avg Duration</div>
                      </div>
                      <div>
                        {isAnalyticsTrafficLoading ? (
                          <Skeleton className="h-8 w-14" />
                        ) : (
                          <div className="font-display text-[29px] leading-none text-[rgba(30,165,80,0.9)]">{trafficKpis.bounceRate}</div>
                        )}
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Bounce Rate</div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)] mb-3">
                      Traffic by Channel
                    </div>

                    <div className="space-y-3.5">
                      {isAnalyticsTrafficLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <div key={`analytics-channel-skeleton-${index}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <Skeleton className="h-3 w-36" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                          </div>
                        ))
                      ) : (
                        analyticsChannels.map((channel) => (
                          <div key={channel.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="font-mono text-[10px] text-[rgba(255,255,255,0.62)]">{channel.name}</div>
                              <div className="font-mono text-[10px] text-[rgba(255,255,255,0.56)]">
                                <span className="text-[rgba(14,200,198,0.86)]">{channel.visits}</span>
                                <span className="ml-2">{channel.share}%</span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                              <div
                                className={channel.accent === 'gold' ? 'h-full bg-[rgba(201,168,76,0.9)]' : 'h-full bg-[rgba(14,200,198,0.85)]'}
                                style={{ width: `${channel.share}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
                  style={isLightTheme ? { background: 'rgba(248,242,252,0.6)', borderColor: 'rgba(164,131,174,0.2)' } : undefined}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)]"
                      style={isLightTheme ? { color: '#A483AE' } : undefined}>
                      Top Pages
                    </div>
                    <div className="px-2 py-[3px] rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] font-mono text-[8px] text-[rgba(14,200,198,0.88)]"
                      style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' } : undefined}>
                      GSC Connected
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] table-fixed border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.08)]"
                          style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.2)' } : undefined}>
                          <th className="py-2.5 pr-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Page</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Visits</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Avg Position</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>CTR</th>
                          <th className="py-2.5 pl-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Generated By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isAnalyticsTrafficLoading ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <tr key={`analytics-top-pages-skeleton-${index}`} className="border-b border-[rgba(255,255,255,0.05)]"
                              style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.12)' } : undefined}>
                              <td className="py-2.5 pr-3"><Skeleton className="h-4 w-64" /></td>
                              <td className="py-2.5 px-3"><Skeleton className="h-4 w-14" /></td>
                              <td className="py-2.5 px-3"><Skeleton className="h-4 w-12" /></td>
                              <td className="py-2.5 px-3"><Skeleton className="h-4 w-10" /></td>
                              <td className="py-2.5 pl-3"><Skeleton className="h-4 w-24" /></td>
                            </tr>
                          ))
                        ) : (
                          analyticsTopPages.map((row) => (
                            <tr key={row.page} className="border-b border-[rgba(255,255,255,0.05)]"
                              style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.12)' } : undefined}>
                              <td className="py-2.5 pr-3 font-[Rajdhani] text-[13px] font-semibold text-[rgba(235,245,255,0.9)]"
                                style={isLightTheme ? { color: '#6B4F72' } : undefined}>{row.page}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]"
                                style={isLightTheme ? { color: '#8F6B97' } : undefined}>{row.visits}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]"
                                style={isLightTheme ? { color: '#8F6B97' } : undefined}>{row.avgPosition}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]"
                                style={isLightTheme ? { color: '#8F6B97' } : undefined}>{row.ctr}</td>
                              <td className="py-2.5 pl-3 font-mono text-[11px] text-[rgba(14,200,198,0.82)]"
                                style={isLightTheme ? { color: '#9A6FA8' } : undefined}>{row.generatedBy}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'conversions' && (
              <div>
                {!isAnalyticsConversionsLoading && (conversionFunnel.length === 0 || revenueBreakdown.length === 0) ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]">
                      Conversion metrics are not available yet.
                    </div>
                  </GlassCard>
                ) : null}

                {/* Conversion Funnel & Revenue Breakdown Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.2fr] gap-5 mb-6">
                  {/* Conversion Funnel */}
                  <GlassCard className="px-6 py-5 border-[rgba(14,124,123,0.32)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)]">
                        Conversion Funnel
                      </div>
                      <div className="px-2.5 py-1 rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] font-mono text-[8px] text-[rgba(14,200,198,0.88)]">
                        This Month
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {(isAnalyticsConversionsLoading
                        ? Array.from({ length: 4 }).map((_, idx) => ({
                            label: `stage-${idx}`,
                            count: 0,
                            percentage: 0,
                            dropoff: idx < 3 ? 0 : undefined,
                          }))
                        : conversionFunnel
                      ).map((stage, idx) => (
                        <div key={stage.label}>
                          {/* Funnel box */}
                          <div className="rounded-lg border-2 border-[rgba(14,124,123,0.5)] bg-gradient-to-r from-[rgba(14,124,123,0.25)] to-[rgba(14,124,123,0.12)] px-4 py-3.5 flex items-center justify-between group hover:border-[rgba(14,200,198,0.7)] transition-all">
                            <div className="flex-1">
                              {isAnalyticsConversionsLoading ? (
                                <Skeleton className="h-4 w-28" />
                              ) : (
                                <div className="font-mono text-[11px] text-[rgba(255,255,255,0.7)] font-semibold">
                                  {stage.label}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {isAnalyticsConversionsLoading ? (
                                <Skeleton className="h-8 w-20" />
                              ) : (
                                <div className="font-display text-[28px] leading-none font-bold text-[rgba(14,200,198,0.95)]">
                                  {stage.count.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Conversion indicator - shown below each box except the last */}
                          {((isAnalyticsConversionsLoading && idx < 3) || (!isAnalyticsConversionsLoading && stage.dropoff && idx < conversionFunnel.length - 1)) && (
                            <div className="px-4 py-1.5 text-center">
                              {isAnalyticsConversionsLoading ? (
                                <Skeleton className="mx-auto h-3 w-24" />
                              ) : (
                                <div className="font-mono text-[8.5px] text-[rgba(255,150,150,0.75)] tracking-wider">
                                  ↓ {stage.dropoff}% dropoff
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Funnel Summary Metrics */}
                    <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)]">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          {isAnalyticsConversionsLoading ? (
                            <Skeleton className="mx-auto mb-1 h-7 w-16" />
                          ) : (
                            <div className="font-display text-[24px] leading-none font-bold text-[rgba(14,200,198,0.92)] mb-1">
                              {conversionKpis.overallConvRate}
                            </div>
                          )}
                          <div className="font-mono text-[8px] text-[rgba(255,255,255,0.35)] tracking-tight">
                            Overall Conv. Rate
                          </div>
                        </div>
                        <div className="text-center">
                          {isAnalyticsConversionsLoading ? (
                            <Skeleton className="mx-auto mb-1 h-7 w-12" />
                          ) : (
                            <div className="font-display text-[24px] leading-none font-bold text-[rgba(30,165,80,0.85)] mb-1">
                              {conversionKpis.trialToPaid}
                            </div>
                          )}
                          <div className="font-mono text-[8px] text-[rgba(255,255,255,0.35)] tracking-tight">
                            Trial to Paid
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Revenue Breakdown */}
                  <GlassCard className="px-6 py-5 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)] mb-5">
                      Revenue Breakdown
                    </div>

                    <div className="space-y-4 mb-6">
                      {(isAnalyticsConversionsLoading
                        ? Array.from({ length: 3 }).map((_, idx) => ({
                            tier: `tier-${idx}`,
                            revenue: 0,
                            percentage: 0,
                            color: 'rgba(255,255,255,0.2)',
                          }))
                        : revenueBreakdown
                      ).map((segment) => (
                        <div key={segment.tier} className="space-y-1.5">
                          <div className="flex items-end justify-between">
                            {isAnalyticsConversionsLoading ? (
                              <Skeleton className="h-4 w-20" />
                            ) : (
                              <div className="font-mono text-[11px] text-[rgba(255,255,255,0.68)] font-medium">
                                {segment.tier}
                              </div>
                            )}
                            <div className="flex items-baseline gap-2">
                              {isAnalyticsConversionsLoading ? (
                                <Skeleton className="h-5 w-24" />
                              ) : (
                                <>
                                  <div className="font-display text-[19px] leading-none font-bold text-[rgba(255,255,255,0.88)]">
                                    ${segment.revenue.toLocaleString()}
                                  </div>
                                  <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)]">
                                    {segment.percentage}%
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Revenue bar */}
                          <div className="h-[10px] rounded-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                            {isAnalyticsConversionsLoading ? (
                              <Skeleton className="h-full w-full rounded-none" />
                            ) : (
                              <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  width: `${segment.percentage}%`,
                                  backgroundColor: segment.color,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Revenue KPIs */}
                    <div className="grid grid-cols-2 gap-3.5 pt-5 border-t border-[rgba(255,255,255,0.08)]">
                      <div className="p-4 rounded-lg bg-[rgba(0,0,0,0.25)] border border-[rgba(14,124,123,0.25)]">
                        <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide">
                          ARR
                        </div>
                        <div className="font-display text-[28px] leading-none font-bold text-[rgba(14,200,198,0.95)]">
                          {conversionKpis.arr}
                        </div>
                        <div className="font-mono text-[8px] text-[rgba(30,165,80,0.8)] mt-1.5">
                          {conversionKpis.arrGrowthLabel !== '—' ? `▲ ${conversionKpis.arrGrowthLabel}` : conversionKpis.arrGrowthLabel}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-[rgba(0,0,0,0.25)] border border-[rgba(255,80,80,0.25)]">
                        <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide">
                          Churn Rate
                        </div>
                        <div className="font-display text-[28px] leading-none font-bold text-[rgba(255,120,120,0.95)]">
                          {conversionKpis.churnRate}
                        </div>
                        <div className="font-mono text-[8px] text-[rgba(255,100,100,0.8)] mt-1.5">
                          {conversionKpis.churnRate === '—' ? '—' : 'From payment data'}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Additional Conversion Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <GlassCard className="px-5 py-4 text-center border-[rgba(14,124,123,0.25)]">
                    <div className="font-mono text-[9px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide uppercase">
                      Avg. Customer LTV
                    </div>
                    <div className="font-display text-[30px] font-bold text-[rgba(14,200,198,0.92)]">
                      {conversionKpis.avgLtv}
                    </div>
                    <div className="font-mono text-[8px] text-[rgba(255,255,255,0.3)] mt-2">
                      Over 24 month avg
                    </div>
                  </GlassCard>

                  <GlassCard className="px-5 py-4 text-center border-[rgba(255,255,255,0.08)]">
                    <div className="font-mono text-[9px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide uppercase">
                      CAC Payback
                    </div>
                    <div className="font-display text-[30px] font-bold text-[rgba(30,165,80,0.85)]">
                      {conversionKpis.cacPayback}
                    </div>
                    <div className="font-mono text-[8px] text-[rgba(255,255,255,0.3)] mt-2">
                      Months to recover
                    </div>
                  </GlassCard>

                  <GlassCard className="px-5 py-4 text-center border-[rgba(255,255,255,0.08)]">
                    <div className="font-mono text-[9px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide uppercase">
                      Active Subscriptions
                    </div>
                    <div className="font-display text-[30px] font-bold text-[rgba(255,210,100,0.92)]">
                      {conversionKpis.activeSubscriptions}
                    </div>
                    <div className="font-mono text-[8px] text-[rgba(255,255,255,0.3)] mt-2">
                      {conversionKpis.subsMomLabel}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'ab-tests' && (
              <div>
                {!isAnalyticsAbTestsLoading && abTests.length === 0 ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]"
                      style={isLightTheme ? { color: '#A483AE' } : undefined}>
                      No A/B tests are available for this workspace yet.
                    </div>
                  </GlassCard>
                ) : null}

                {/* A/B Tests Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    A/B Tests
                  </div>
                  {isAnalyticsAbTestsLoading ? (
                    <Skeleton className="h-7 w-24 rounded-full" />
                  ) : (
                    <div className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)]"
                      style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' } : undefined}>
                      {abTests.length} Active Tests
                    </div>
                  )}
                </div>

                {/* A/B Tests Table */}
                <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
                  style={isLightTheme ? { background: 'rgba(248,242,252,0.6)', borderColor: 'rgba(164,131,174,0.2)' } : undefined}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] table-fixed border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.08)]"
                          style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.2)' } : undefined}>
                          <th className="py-3 pr-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Test</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Variant A</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Variant B</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Winner</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Confidence</th>
                          <th className="py-3 pl-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal" style={isLightTheme ? { color: '#A483AE' } : undefined}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isAnalyticsAbTestsLoading
                          ? Array.from({ length: 4 }).map((_, idx) => ({
                              id: `skeleton-test-${idx}`,
                              name: '',
                              variantA: { label: '', lift: 0 },
                              variantB: { label: '', lift: 0 },
                              winner: undefined,
                              winnerLift: undefined,
                              confidence: 0,
                              status: 'running' as const,
                            }))
                          : abTests
                        ).map((test) => (
                          <tr key={test.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.12)' } : undefined}>
                            {/* Test Name */}
                            <td className="py-3.5 pr-4 font-[Rajdhani] text-[12px] font-semibold text-[rgba(235,245,255,0.9)]"
                              style={isLightTheme ? { color: '#6B4F72' } : undefined}>
                              {isAnalyticsAbTestsLoading ? <Skeleton className="h-4 w-36" /> : test.name}
                            </td>

                            {/* Variant A */}
                            <td className="py-3.5 px-4 font-mono text-[10px] text-[rgba(255,255,255,0.65)] leading-relaxed"
                              style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                              {isAnalyticsAbTestsLoading ? <Skeleton className="h-4 w-40" /> : <div>{test.variantA.label}</div>}
                              {!isAnalyticsAbTestsLoading && test.variantA.lift !== 0 && (
                                <div className={`text-[9px] mt-0.5 ${test.variantA.lift > 0 ? 'text-[rgba(30,165,80,0.8)]' : 'text-[rgba(255,120,120,0.7)]'}`}>
                                  {test.variantA.lift > 0 ? '▲' : '▼'} {Math.abs(test.variantA.lift)}%
                                </div>
                              )}
                            </td>

                            {/* Variant B */}
                            <td className="py-3.5 px-4 font-mono text-[10px] text-[rgba(255,255,255,0.65)] leading-relaxed"
                              style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                              {isAnalyticsAbTestsLoading ? <Skeleton className="h-4 w-40" /> : <div>{test.variantB.label}</div>}
                              {!isAnalyticsAbTestsLoading && test.variantB.lift !== 0 && (
                                <div className={`text-[9px] mt-0.5 ${test.variantB.lift > 0 ? 'text-[rgba(30,165,80,0.8)]' : 'text-[rgba(255,120,120,0.7)]'}`}>
                                  {test.variantB.lift > 0 ? '▲' : '▼'} {Math.abs(test.variantB.lift)}%
                                </div>
                              )}
                            </td>

                            {/* Winner */}
                            <td className="py-3.5 px-4">
                              {isAnalyticsAbTestsLoading ? (
                                <Skeleton className="h-4 w-20" />
                              ) : test.winner && test.winner !== 'none' ? (
                                <div className="font-mono text-[11px] text-[rgba(30,165,80,0.85)]">
                                  <span className="font-bold">B</span>{' '}
                                  <span className="text-[rgba(255,255,255,0.55)]"
                                    style={isLightTheme ? { color: '#A483AE' } : undefined}>+{test.winnerLift}%</span>
                                </div>
                              ) : (
                                <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)]"
                                  style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                                  {test.status === 'too-early' ? 'Too early' : 'In progress'}
                                </div>
                              )}
                            </td>

                            {/* Confidence */}
                            <td className="py-3.5 px-4">
                              {isAnalyticsAbTestsLoading ? (
                                <Skeleton className="h-6 w-16 rounded-full" />
                              ) : (
                                <div className="inline-flex items-center justify-center rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] px-3 py-1 font-mono text-[9px] font-semibold text-[rgba(14,200,198,0.92)]"
                                  style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' } : undefined}>
                                  {test.confidence}%
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 pl-4">
                              {isAnalyticsAbTestsLoading ? (
                                <Skeleton className="h-6 w-20 rounded-full" />
                              ) : (
                                <span
                                  className={[
                                    'inline-flex items-center justify-center rounded-full border px-3 py-1.5 font-mono text-[8.5px] font-semibold leading-none',
                                    test.status === 'complete'
                                      ? 'border-[rgba(30,165,80,0.4)] bg-[rgba(30,165,80,0.12)] text-[rgba(100,220,120,0.92)]'
                                      : test.status === 'running'
                                      ? 'border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.14)] text-[rgba(14,200,198,0.92)]'
                                      : 'border-[rgba(255,150,100,0.35)] bg-[rgba(255,150,100,0.12)] text-[rgba(255,180,120,0.88)]',
                                  ].join(' ')}
                                  style={isLightTheme
                                    ? test.status === 'complete'
                                      ? { color: '#3a8f5a', borderColor: 'rgba(58,143,90,0.4)', background: 'rgba(58,143,90,0.1)' }
                                      : test.status === 'running'
                                      ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.4)', background: 'rgba(185,156,190,0.15)' }
                                      : { color: '#b06030', borderColor: 'rgba(176,96,48,0.4)', background: 'rgba(176,96,48,0.1)' }
                                    : undefined}
                                >
                                  {test.status === 'complete' ? 'Complete' : test.status === 'running' ? 'Running' : 'Too Early'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>

                {/* A/B Tests Summary */}
                <div className="mt-4 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]"
                  style={isLightTheme ? { background: 'rgba(185,156,190,0.1)', borderColor: 'rgba(164,131,174,0.18)' } : undefined}>
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide"
                    style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                    {isAnalyticsAbTestsLoading ? (
                      <Skeleton className="h-3 w-full" />
                    ) : (
                      <>
                        <span className="text-[rgba(14,200,198,0.75)]"
                          style={isLightTheme ? { color: '#8F6B97' } : undefined}>✓ 1</span> test completed
                        <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                          style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                        <span className="text-[rgba(14,200,198,0.75)]"
                          style={isLightTheme ? { color: '#8F6B97' } : undefined}>3</span> currently running
                        <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                          style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                        <span className="text-[rgba(255,180,120,0.75)]"
                          style={isLightTheme ? { color: '#b06030' } : undefined}>1</span> awaiting more data
                        <span className="mx-2 text-[rgba(255,255,255,0.15)]"
                          style={isLightTheme ? { color: '#D4B8D9' } : undefined}>|</span>
                        <span className="text-[rgba(255,255,255,0.25)]"
                          style={isLightTheme ? { color: '#A483AE' } : undefined}>Avg sample size: 2.4K per variant</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && activeContentLever === 'kb' && (
              <div>
                {kbDocuments.length === 0 ? (
                  <GlassCard className="mb-6 px-6 py-8 border-[rgba(14,200,198,0.18)] bg-[rgba(14,124,123,0.07)] text-center"
                    style={isLightTheme ? { background: 'rgba(185,156,190,0.12)', borderColor: 'rgba(164,131,174,0.25)' } : undefined}>
                    <div className="font-mono text-[10px] tracking-[3px] text-[rgba(14,200,198,0.6)] uppercase mb-2"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      Knowledge Base Is Empty
                    </div>
                    <div className="text-[13px] text-[rgba(200,220,245,0.55)] mb-5"
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                      Upload your first document to start training content and research agents.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKbUpload(true)}
                      className="inline-flex items-center gap-2 rounded-full font-mono text-[11px] tracking-[1px] text-[rgba(14,200,198,0.95)] hover:bg-[rgba(14,200,198,0.12)] transition-colors"
                      style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.45)', background: 'transparent', padding: '8px 22px', border: '1px solid' } : { border: '1px solid rgba(14,200,198,0.45)', padding: '8px 22px' }}
                    >
                      + Upload Document
                    </button>
                  </GlassCard>
                ) : null}

                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Knowledge Base
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]"
                    style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.6)', background: 'rgba(185,156,190,0.2)', boxShadow: '0 0 14px rgba(143,107,151,0.25), 0 0 28px rgba(143,107,151,0.12), inset 0 1px 0 rgba(143,107,151,0.15)' } : undefined}>
                    {kbDocuments.length} Documents
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {kbDocuments.map((doc) => (
                    <GlassCard
                      key={doc.id}
                      className="flex flex-col px-5 py-4 rounded-2xl border-[rgba(255,255,255,0.1)] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      style={isLightTheme
                        ? {
                            background: 'rgba(248,242,252,0.75)',
                            borderColor: 'rgba(164,131,174,0.2)',
                            boxShadow: '0 8px 18px rgba(143,107,151,0.08), inset 0 1px 0 rgba(255,255,255,0.65)',
                          }
                        : { background: 'linear-gradient(160deg, #0c1424 0%, #060c18 100%)' }}
                    >
                      {/* Category label */}
                      <div className={[
                        'font-mono text-[9px] tracking-[2px] uppercase mb-2.5 font-medium',
                        kbCategoryToneClass[doc.category],
                      ].join(' ')} style={isLightTheme ? { color: '#9A6FA8' } : undefined}>
                        {contentCategoryLabel[doc.category]}
                      </div>

                      {/* Title */}
                      <div className="font-[Rajdhani,sans-serif] text-[19px] leading-[1.18] font-bold text-[rgba(236,245,255,0.96)] mb-2 tracking-[0.1px]"
                        style={isLightTheme ? { color: '#6B4F72' } : undefined}>
                        {doc.title}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-1 font-mono text-[10px] text-[rgba(200,220,245,0.5)] mb-4"
                        style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                        <span>{doc.words}</span>
                        <span className="mx-1 text-[rgba(255,255,255,0.3)] select-none" style={isLightTheme ? { color: '#D4B8D9' } : undefined}>·</span>
                        <span>{doc.updated}</span>
                      </div>

                      {/* Actions */}
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          onClick={() => { void handleViewKbDoc(doc.id); }}
                          disabled={viewKbDocLoading}
                          className="rounded-full border border-[rgba(210,228,255,0.32)] bg-[rgba(210,228,255,0.07)] px-4 py-1.5 text-[11px] font-medium text-[rgba(220,235,255,0.82)] hover:bg-[rgba(210,228,255,0.14)] hover:text-white hover:border-[rgba(210,228,255,0.5)] disabled:opacity-40 transition-all duration-150"
                          style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.35)', background: 'rgba(185,156,190,0.08)' } : undefined}>
                          View
                        </button>
                        <button
                          onClick={() => { void handleRetrainKbDoc(doc.id, doc.title); }}
                          disabled={retrainLoadingDocId === doc.id}
                          className={[
                            'rounded-full border px-4 py-1.5 text-[11px] font-semibold transition-all duration-150 disabled:opacity-40',
                            doc.actionLabel === 'Edit'
                              ? 'border-[rgba(214,174,62,0.55)] bg-[rgba(214,174,62,0.18)] text-[rgba(255,212,96,0.97)] hover:bg-[rgba(214,174,62,0.3)] hover:border-[rgba(214,174,62,0.75)]'
                              : 'border-[rgba(14,200,198,0.5)] bg-[rgba(14,160,156,0.22)] text-[rgba(24,222,220,0.97)] hover:bg-[rgba(14,160,156,0.38)] hover:border-[rgba(14,200,198,0.72)]',
                          ].join(' ')}
                          style={isLightTheme && doc.actionLabel !== 'Edit' ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.45)', background: 'rgba(185,156,190,0.15)' } : undefined}
                        >
                          {retrainLoadingDocId === doc.id ? 'Working…' : doc.actionLabel}
                        </button>
                      </div>
                    </GlassCard>
                  ))}

                  <button
                    onClick={() => setShowKbUpload(true)}
                    className="min-h-[128px] rounded-2xl border border-dashed border-[rgba(14,188,186,0.4)] bg-[rgba(2,18,28,0.72)] hover:bg-[rgba(3,28,40,0.82)] hover:border-[rgba(14,188,186,0.58)] transition-all duration-200 flex flex-col items-center justify-center text-center gap-2"
                    style={isLightTheme ? { borderColor: 'rgba(143,107,151,0.35)', background: 'rgba(185,156,190,0.08)' } : undefined}>
                    <span className="text-[26px] leading-none text-[rgba(24,214,220,0.72)] font-light"
                      style={isLightTheme ? { color: '#9A6FA8' } : undefined}>+</span>
                    <span className="font-mono text-[10px] tracking-[1.4px] text-[rgba(24,214,220,0.68)]"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      Upload New Document
                    </span>
                  </button>
                </div>

                {/* KB Upload Modal */}
                {showKbUpload && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) { setShowKbUpload(false); setKbUploadTitle(''); setKbUploadContent(''); setKbFileName(null); } }}>
                    <div
                      className="w-full max-w-lg rounded-2xl border shadow-[0_32px_80px_rgba(0,0,0,0.75)] overflow-hidden"
                      style={isLightTheme
                        ? { background: 'rgba(252,248,255,0.98)', borderColor: 'rgba(143,107,151,0.35)', boxShadow: '0 32px 80px rgba(100,60,120,0.18)' }
                        : { background: '#07101e', borderColor: 'rgba(14,200,198,0.25)' }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b"
                        style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.2)' } : { borderColor: 'rgba(255,255,255,0.07)' }}>
                        <div>
                          <div className="font-mono text-[9px] tracking-[3px] uppercase mb-0.5"
                            style={isLightTheme ? { color: '#9A6FA8' } : { color: 'rgba(14,200,198,0.65)' }}>
                            Knowledge Base
                          </div>
                          <div className="font-[Rajdhani,sans-serif] text-[17px] font-bold"
                            style={isLightTheme ? { color: '#4A3356' } : { color: 'rgba(230,242,255,0.95)' }}>
                            Upload Document
                          </div>
                        </div>
                        <button
                          onClick={() => { setShowKbUpload(false); setKbUploadTitle(''); setKbUploadContent(''); setKbFileName(null); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-lg leading-none"
                          style={isLightTheme
                            ? { color: '#9A6FA8', background: 'rgba(143,107,151,0.1)' }
                            : { color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
                          ×
                        </button>
                      </div>

                      {/* Body */}
                      <div className="px-6 py-5 space-y-4">
                        {/* File drop zone */}
                        <div>
                          <label className="block font-mono text-[9px] tracking-[1.8px] uppercase mb-1.5"
                            style={isLightTheme ? { color: '#A483AE' } : { color: 'rgba(255,255,255,0.38)' }}>
                            File <span className="normal-case tracking-normal opacity-60">(PDF, TXT, MD, CSV — max 10 MB)</span>
                          </label>
                          <label
                            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 border border-dashed cursor-pointer transition-all duration-150"
                            style={isLightTheme
                              ? { background: 'rgba(143,107,151,0.05)', borderColor: kbFileName ? 'rgba(143,107,151,0.5)' : 'rgba(143,107,151,0.22)', color: '#7A5888' }
                              : { background: 'rgba(255,255,255,0.03)', borderColor: kbFileName ? 'rgba(14,200,198,0.5)' : 'rgba(255,255,255,0.12)', color: 'rgba(14,200,198,0.75)' }}
                          >
                            <input
                              type="file"
                              accept=".pdf,.txt,.md,.csv"
                              className="hidden"
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setKbFileLoading(true);
                                setKbFileName(file.name);
                                try {
                                  if (file.name.match(/\.(txt|md|csv)$/i)) {
                                    const text = await file.text();
                                    setKbUploadContent(text.trim());
                                    if (!kbUploadTitle.trim()) setKbUploadTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
                                  } else {
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    const res = await fetch('/api/kb/parse-file', { method: 'POST', body: fd });
                                    if (!res.ok) {
                                      const err = (await res.json().catch(() => null)) as { error?: string } | null;
                                      throw new Error(err?.error ?? 'Failed to parse file');
                                    }
                                    const data = (await res.json()) as { text: string; filename: string };
                                    setKbUploadContent(data.text);
                                    if (!kbUploadTitle.trim()) setKbUploadTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
                                  }
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : 'Failed to read file');
                                  setKbFileName(null);
                                } finally {
                                  setKbFileLoading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                            {kbFileLoading ? (
                              <span className="font-mono text-[11px] opacity-60">Extracting text…</span>
                            ) : kbFileName ? (
                              <>
                                <span className="text-base">&#128196;</span>
                                <span className="font-mono text-[11px] flex-1 truncate">{kbFileName}</span>
                                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                                  style={isLightTheme ? { background: 'rgba(143,107,151,0.15)', color: '#7A5888' } : { background: 'rgba(14,200,198,0.15)', color: 'rgba(14,200,198,0.9)' }}>
                                  Extracted ✓
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-base opacity-50">📎</span>
                                <span className="font-mono text-[11px] opacity-55">Choose file or paste content below…</span>
                              </>
                            )}
                          </label>
                        </div>

                        {/* Title field */}
                        <div>
                          <label className="block font-mono text-[9px] tracking-[1.8px] uppercase mb-1.5"
                            style={isLightTheme ? { color: '#A483AE' } : { color: 'rgba(255,255,255,0.38)' }}>
                            Title
                          </label>
                          <input
                            type="text"
                            value={kbUploadTitle}
                            onChange={e => setKbUploadTitle(e.target.value)}
                            placeholder="e.g. Brand Voice Guidelines 2026"
                            className="w-full rounded-xl px-3.5 py-2.5 font-mono text-[12px] focus:outline-none transition-colors"
                            style={isLightTheme
                              ? { background: 'rgba(143,107,151,0.07)', border: '1px solid rgba(143,107,151,0.25)', color: '#3D2B4A', '::placeholder': 'rgba(143,107,151,0.45)' } as React.CSSProperties
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(230,242,255,0.9)' }}
                          />
                        </div>

                        {/* Category pill buttons */}
                        <div>
                          <label className="block font-mono text-[9px] tracking-[1.8px] uppercase mb-2"
                            style={isLightTheme ? { color: '#A483AE' } : { color: 'rgba(255,255,255,0.38)' }}>
                            Category
                          </label>
                          <div className="flex gap-2">
                            {([
                              { value: 'product-docs', label: 'Product Docs', icon: '📄' },
                              { value: 'brand',        label: 'Brand',        icon: '✦' },
                              { value: 'competitor-intel', label: 'Competitor', icon: '🔍' },
                            ] as { value: typeof kbUploadCategory; label: string; icon: string }[]).map(opt => {
                              const active = kbUploadCategory === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setKbUploadCategory(opt.value)}
                                  className="flex-1 rounded-xl py-2 px-2 font-mono text-[10px] font-semibold transition-all duration-150 border flex items-center justify-center gap-1.5"
                                  style={isLightTheme
                                    ? active
                                      ? { background: 'rgba(143,107,151,0.2)', borderColor: 'rgba(143,107,151,0.55)', color: '#6B3F7A' }
                                      : { background: 'rgba(143,107,151,0.05)', borderColor: 'rgba(143,107,151,0.15)', color: '#A483AE' }
                                    : active
                                      ? { background: 'rgba(14,124,123,0.25)', borderColor: 'rgba(14,200,198,0.55)', color: 'rgba(14,220,218,0.97)' }
                                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }
                                  }
                                >
                                  <span>{opt.icon}</span>
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Content textarea */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="font-mono text-[9px] tracking-[1.8px] uppercase"
                              style={isLightTheme ? { color: '#A483AE' } : { color: 'rgba(255,255,255,0.38)' }}>
                              Content
                            </label>
                            <span className="font-mono text-[9px]"
                              style={isLightTheme ? { color: '#B99CBE' } : { color: 'rgba(255,255,255,0.25)' }}>
                              {kbUploadContent.trim() ? kbUploadContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString() + ' words' : '0 words'}
                            </span>
                          </div>
                          <textarea
                            value={kbUploadContent}
                            onChange={e => setKbUploadContent(e.target.value)}
                            placeholder="Paste document content here, or upload a file above…"
                            rows={6}
                            className="w-full rounded-xl px-3.5 py-2.5 font-mono text-[11px] leading-relaxed focus:outline-none transition-colors resize-none"
                            style={isLightTheme
                              ? { background: 'rgba(143,107,151,0.06)', border: '1px solid rgba(143,107,151,0.22)', color: '#3D2B4A' }
                              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(220,235,255,0.85)' }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex gap-2.5 px-6 pb-5 pt-1">
                        <button
                          onClick={() => { void handleKbUpload(); }}
                          disabled={kbUploadLoading || kbFileLoading || !kbUploadTitle.trim() || !kbUploadContent.trim()}
                          className="flex-1 rounded-xl py-2.5 font-mono text-[11px] font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={isLightTheme
                            ? { background: 'rgba(143,107,151,0.18)', border: '1px solid rgba(143,107,151,0.45)', color: '#6B3F7A' }
                            : { background: 'rgba(14,124,123,0.35)', border: '1px solid rgba(14,200,198,0.5)', color: 'rgba(14,220,218,1)' }}
                        >
                          {kbUploadLoading ? 'Uploading…' : kbFileLoading ? 'Reading file…' : 'Upload Document'}
                        </button>
                        <button
                          onClick={() => { setShowKbUpload(false); setKbUploadTitle(''); setKbUploadContent(''); setKbFileName(null); }}
                          className="rounded-xl px-5 py-2.5 font-mono text-[11px] transition-all duration-150"
                          style={isLightTheme
                            ? { background: 'rgba(143,107,151,0.07)', border: '1px solid rgba(143,107,151,0.18)', color: '#9A6FA8' }
                            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* KB View Doc Modal */}
                {viewKbDocState && (
                  <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.78)] backdrop-blur-sm overflow-y-auto py-10 px-4"
                    onClick={e => { if (e.target === e.currentTarget) setViewKbDocState(null); }}
                  >
                    <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-[rgba(14,200,198,0.28)] bg-[#080e18] shadow-[0_24px_64px_rgba(0,0,0,0.7)] my-auto">
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0">
                        <div className="min-w-0 pr-4">
                          <div className="font-mono text-[9px] tracking-[2px] uppercase text-[rgba(14,200,198,0.65)] mb-1">{viewKbDocState.category}</div>
                          <div className="font-[Rajdhani,sans-serif] text-[18px] font-bold text-[rgba(236,245,255,0.95)] truncate">{viewKbDocState.name}</div>
                        </div>
                        <button
                          onClick={() => setViewKbDocState(null)}
                          className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] text-xl leading-none transition-all"
                        >×</button>
                      </div>
                      {/* Scrollable content — capped at 60vh so it never fills the whole screen */}
                      <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: '60vh' }}>
                        <pre className="font-mono text-[12px] text-[rgba(220,235,255,0.78)] whitespace-pre-wrap leading-relaxed break-words">{viewKbDocState.content}</pre>
                      </div>
                      {/* Footer */}
                      <div className="px-6 pb-5 pt-3 border-t border-[rgba(255,255,255,0.08)] flex-shrink-0 flex items-center justify-between">
                        <span className="font-mono text-[9px] text-[rgba(255,255,255,0.25)]">
                          {viewKbDocState.content.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                        </span>
                        <button
                          onClick={() => setViewKbDocState(null)}
                          className="rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] px-5 py-2 font-mono text-[11px] text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.1)] transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'content' && activeContentLever === 'social' && (
              <div>
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Generated Social Posts
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]"
                    style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.6)', background: 'rgba(185,156,190,0.2)', boxShadow: '0 0 14px rgba(143,107,151,0.25), 0 0 28px rgba(143,107,151,0.12), inset 0 1px 0 rgba(143,107,151,0.15)' } : undefined}>
                    Today: 28 Posts
                  </div>
                </div>

                {/* Post cards */}
                <div className="flex flex-col gap-4">
                  {socialPosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-[rgba(14,200,198,0.2)] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]"
                      style={isLightTheme ? { background: 'rgba(248,242,252,0.7)', borderColor: 'rgba(164,131,174,0.25)' } : { background: '#080e18' }}
                    >
                      {/* Card header strip */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]"
                        style={isLightTheme ? { borderColor: 'rgba(164,131,174,0.18)' } : undefined}>
                        <div>
                          <div className="font-mono text-[10px] tracking-[1.6px] text-[rgba(18,218,214,0.88)] mb-0.5"
                            style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                            {post.channel}
                            <span className="mx-1.5 text-[rgba(255,255,255,0.25)]" style={isLightTheme ? { color: '#D4B8D9' } : undefined}>·</span>
                            {post.handle}
                          </div>
                          <div className="font-mono text-[9px] text-[rgba(200,220,245,0.42)] tracking-[0.3px]"
                            style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                            {post.generatedAgo}
                            {post.bias !== null && (
                              <>
                                <span className="mx-1.5 text-[rgba(255,255,255,0.2)]" style={isLightTheme ? { color: '#D4B8D9' } : undefined}>·</span>
                                BIAS {post.bias}
                              </>
                            )}
                            {post.bias === null && (
                              <>
                                <span className="mx-1.5 text-[rgba(255,255,255,0.2)]" style={isLightTheme ? { color: '#D4B8D9' } : undefined}>·</span>
                                No BIAS filter
                              </>
                            )}
                            <span className="mx-1.5 text-[rgba(255,255,255,0.2)]" style={isLightTheme ? { color: '#D4B8D9' } : undefined}>·</span>
                            {post.model}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.status === 'posted' && (
                            <span className="rounded-full border border-[rgba(30,165,80,0.45)] bg-[rgba(30,165,80,0.12)] px-3 py-1 text-[10px] font-mono uppercase tracking-[1.2px] text-[rgba(120,245,165,0.96)]">
                              Posted
                            </span>
                          )}
                          {post.status !== 'posted' && (
                            <button
                              onClick={() => { void handleSocialPrimaryAction(post); }}
                              disabled={socialActionLoadingId === post.id}
                              aria-busy={socialActionLoadingId === post.id}
                              className="rounded-full border border-[rgba(14,200,198,0.55)] bg-[rgba(14,160,156,0.28)] px-4 py-1.5 text-[11px] font-semibold text-[rgba(24,222,220,0.97)] hover:bg-[rgba(14,160,156,0.44)] hover:border-[rgba(14,200,198,0.78)] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-55"
                              style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.5)', background: 'rgba(185,156,190,0.18)' } : undefined}
                            >
                              <span className="inline-flex items-center gap-2">
                                {socialActionLoadingId === post.id && (
                                  <span
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 rounded-full border border-current border-t-transparent animate-spin"
                                  />
                                )}
                                {socialActionLoadingId === post.id ? 'Posting...' : post.primaryAction}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => openSocialEdit(post)}
                            disabled={post.status === 'posted'}
                            className="rounded-full border border-[rgba(210,228,255,0.28)] bg-[rgba(210,228,255,0.06)] px-4 py-1.5 text-[11px] font-medium text-[rgba(220,235,255,0.75)] hover:bg-[rgba(210,228,255,0.13)] hover:text-white hover:border-[rgba(210,228,255,0.46)] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                            style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.35)', background: 'rgba(185,156,190,0.08)' } : undefined}>
                            {post.secondaryAction}
                          </button>
                        </div>
                      </div>

                      {/* Post body */}
                      <div
                        className="px-5 py-4 mx-4 my-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-3"
                        style={isLightTheme ? { background: 'rgba(185,156,190,0.12)', borderColor: 'rgba(164,131,174,0.18)' } : { background: '#03060f' }}
                      >
                        {post.body.map((line, i) => (
                          <p key={i} className="font-mono text-[11px] leading-[1.7] text-[rgba(215,232,255,0.82)]"
                            style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'content' && activeContentLever === 'blog' && (
              <div>
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Blog Articles
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]"
                    style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.6)', background: 'rgba(185,156,190,0.2)', boxShadow: '0 0 14px rgba(143,107,151,0.25), 0 0 28px rgba(143,107,151,0.12), inset 0 1px 0 rgba(143,107,151,0.15)' } : undefined}>
                    {blogArticles.filter(a => a.published).length} Published This Month
                  </div>
                </div>

                {/* Table — native <table> so layout never collapses */}
                <div
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  style={isLightTheme ? { background: 'rgba(248,242,252,0.6)', borderColor: 'rgba(164,131,174,0.2)' } : { background: '#080e18' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={isLightTheme ? { borderBottom: '1px solid rgba(164,131,174,0.2)' } : { borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        {[
                          { label: 'TITLE',     width: 'auto' },
                          { label: 'WORDS',     width: '88px' },
                          { label: 'BIAS',      width: '80px' },
                          { label: 'PUBLISHED', width: '108px' },
                          { label: 'VISITS',    width: '80px' },
                          { label: 'ACTIONS',   width: '90px' },
                        ].map(({ label, width }) => (
                          <th
                            key={label}
                            style={{ width, paddingLeft: label === 'TITLE' ? '20px' : undefined, paddingRight: label === 'ACTIONS' ? '20px' : undefined, color: isLightTheme ? '#A483AE' : undefined }}
                            className="py-3 text-left font-mono text-[8.5px] tracking-[1.6px] text-[rgba(255,255,255,0.3)] uppercase font-normal"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {blogArticles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center font-mono text-[11px] text-[rgba(255,255,255,0.28)]"
                            style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                            No blog articles yet. Approve a HITL queue item to generate the first entry.
                          </td>
                        </tr>
                      ) : blogArticles.map((article, idx) => (
                        <tr
                          key={article.id}
                          style={idx < blogArticles.length - 1 ? { borderBottom: isLightTheme ? '1px solid rgba(164,131,174,0.12)' : '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Title */}
                          <td className="py-4 pl-5 pr-4 text-[13px] font-medium leading-snug text-[rgba(225,238,255,0.92)]"
                            style={isLightTheme ? { color: '#6B4F72' } : undefined}>
                            {article.title}
                          </td>

                          {/* Words */}
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]"
                            style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                            {article.words}
                          </td>

                          {/* BIAS */}
                          <td className="py-4">
                            <span
                              className="inline-flex items-center rounded-full font-mono text-[10px] font-semibold"
                              style={isLightTheme ? {
                                border: '1px solid rgba(143,107,151,0.45)',
                                background: 'rgba(185,156,190,0.2)',
                                color: '#8F6B97',
                                padding: '2px 10px',
                              } : {
                                border: '1px solid rgba(14,200,198,0.45)',
                                background: 'rgba(14,100,98,0.32)',
                                color: 'rgba(24,222,220,0.95)',
                                padding: '2px 10px',
                              }}
                            >
                              {article.bias}
                            </span>
                          </td>

                          {/* Published */}
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]"
                            style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                            {article.published ?? (
                              <span style={isLightTheme ? { color: '#b06030' } : { color: 'rgba(255,200,100,0.8)' }}>In Progress</span>
                            )}
                          </td>

                          {/* Visits */}
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]"
                            style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                            {article.visits ?? <span style={isLightTheme ? { color: '#D4B8D9' } : { color: 'rgba(255,255,255,0.2)' }}>—</span>}
                          </td>

                          {/* Action */}
                          <td className="py-4 pr-5">
                            <button
                              className="rounded-full font-mono text-[11px] font-medium transition-all duration-150"
                              style={isLightTheme ? {
                                border: '1px solid rgba(143,107,151,0.35)',
                                background: 'rgba(185,156,190,0.08)',
                                color: '#8F6B97',
                                padding: '4px 14px',
                              } : {
                                border: '1px solid rgba(210,228,255,0.28)',
                                background: 'rgba(210,228,255,0.06)',
                                color: 'rgba(220,235,255,0.78)',
                                padding: '4px 14px',
                              }}
                            >
                              {article.action}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && activeContactsLever === 'all' && (
              <div>
                {contacts.length === 0 && dashboardLoadState !== 'loading' ? (
                  <GlassCard className="mb-6 px-6 py-8 border-[rgba(14,200,198,0.18)] bg-[rgba(14,124,123,0.07)] text-center"
                    style={isLightTheme ? { background: 'rgba(185,156,190,0.12)', borderColor: 'rgba(164,131,174,0.25)' } : undefined}>
                    <div className="font-mono text-[10px] tracking-[3px] text-[rgba(14,200,198,0.6)] uppercase mb-2"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      No Contacts Synced
                    </div>
                    <div className="text-[13px] text-[rgba(200,220,245,0.55)] mb-5"
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                      {hubspotConnected
                        ? 'HubSpot is connected, but no contacts were returned yet. Trigger a new sync or verify HubSpot contact visibility/scopes.'
                        : 'Connect HubSpot to automatically sync and enrich your contacts.'}
                    </div>
                    {hubspotConnected ? (
                      <button
                        type="button"
                        onClick={() => { void refreshDashboardData(true); }}
                        className="inline-flex items-center gap-2 rounded-full font-mono text-[11px] tracking-[1px] text-[rgba(14,200,198,0.95)] hover:bg-[rgba(14,200,198,0.12)] transition-colors"
                        style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.45)', background: 'transparent', padding: '8px 22px', border: '1px solid' } : { border: '1px solid rgba(14,200,198,0.45)', padding: '8px 22px' }}
                      >
                        ↻ Retry Sync
                      </button>
                    ) : (
                      <a
                        href="/api/hubspot/auth"
                        className="inline-flex items-center gap-2 rounded-full font-mono text-[11px] tracking-[1px] text-[rgba(14,200,198,0.95)] hover:bg-[rgba(14,200,198,0.12)] transition-colors"
                        style={isLightTheme ? { color: '#8F6B97', borderColor: 'rgba(143,107,151,0.45)', background: 'transparent', padding: '8px 22px', border: '1px solid' } : { border: '1px solid rgba(14,200,198,0.45)', padding: '8px 22px' }}
                      >
                        🔵 Connect HubSpot
                      </a>
                    )}
                  </GlassCard>
                ) : contacts.length === 0 && dashboardLoadState === 'loading' ? (
                  <div className="space-y-2 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                ) : null}

                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    All Contacts
                  </div>
                  {/* Plain white-border pill — matches reference exactly (no teal glow) */}
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.5px] text-[rgba(230,242,255,0.92)]"
                    style={isLightTheme ? {
                      border: '1px solid rgba(143,107,151,0.4)',
                      background: 'rgba(185,156,190,0.12)',
                      padding: '6px 18px',
                      color: '#8F6B97',
                    } : {
                      border: '1px solid rgba(220,235,255,0.38)',
                      background: 'rgba(220,235,255,0.06)',
                      padding: '6px 18px',
                    }}
                  >
                    {contactsSummary.totalSynced} HubSpot Synced
                  </div>
                </div>

                {/* Table */}
                <div
                  className="rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  style={isLightTheme ? { background: 'rgba(248,242,252,0.6)', border: '1px solid rgba(164,131,174,0.2)' } : { background: '#080e18', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={isLightTheme ? { borderBottom: '1px solid rgba(164,131,174,0.2)' } : { borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['NAME', 'COMPANY', 'STAGE', 'LEAD SCORE', 'LAST ENRICHED', 'RISK'].map((col) => (
                          <th
                            key={col}
                            className="text-left font-mono text-[8.5px] tracking-[2px] text-[rgba(255,255,255,0.28)] uppercase font-normal"
                            style={{
                              padding: '14px 12px',
                              paddingLeft: col === 'NAME' ? '24px' : '12px',
                              paddingRight: col === 'RISK' ? '24px' : '12px',
                              color: isLightTheme ? '#A483AE' : undefined,
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, idx) => (
                        <tr
                          key={contact.id}
                          style={idx < contacts.length - 1 ? { borderBottom: isLightTheme ? '1px solid rgba(164,131,174,0.12)' : '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Name */}
                          <td
                            className="text-[15px] font-bold text-[rgba(235,245,255,0.96)] whitespace-nowrap"
                            style={{ padding: '18px 12px 18px 24px', color: isLightTheme ? '#6B4F72' : undefined }}
                          >
                            {contact.name}
                          </td>

                          {/* Company */}
                          <td
                            className="text-[13px] text-[rgba(190,210,240,0.52)] whitespace-nowrap"
                            style={{ padding: '18px 12px', color: isLightTheme ? '#8F6B97' : undefined }}
                          >
                            {contact.company}
                          </td>

                          {/* Stage */}
                          <td style={{ padding: '18px 12px' }}>
                            <span
                              className="inline-flex items-center rounded-full font-mono text-[11px] font-medium"
                              style={{ ...STAGE_STYLE[contact.stage], padding: '5px 16px' }}
                            >
                              {contact.stage}
                            </span>
                          </td>

                          {/* Lead Score */}
                          <td style={{ padding: '18px 12px' }}>
                            <span
                              className="inline-flex items-center justify-center rounded-full font-mono text-[12px] font-bold"
                              style={isLightTheme ? {
                                width: '40px',
                                height: '40px',
                                border: '1px solid rgba(143,107,151,0.45)',
                                background: 'rgba(185,156,190,0.2)',
                                color: '#8F6B97',
                              } : {
                                width: '40px',
                                height: '40px',
                                border: '1px solid rgba(14,200,198,0.5)',
                                background: 'rgba(14,100,98,0.22)',
                                color: 'rgba(24,222,220,0.97)',
                              }}
                            >
                              {contact.leadScore}
                            </span>
                          </td>

                          {/* Last Enriched */}
                          <td
                            className="text-[13px] text-[rgba(190,210,240,0.52)]"
                            style={{ padding: '18px 12px', color: isLightTheme ? '#8F6B97' : undefined }}
                          >
                            {contact.lastEnriched}
                          </td>

                          {/* Risk */}
                          <td
                            className="font-mono text-[12px] font-semibold"
                            style={{ padding: '18px 24px 18px 12px' }}
                          >
                            {contact.risk ? (
                              <span style={RISK_STYLE[contact.risk]}>
                                {contact.risk}{contact.risk === 'High' && <span style={{ marginLeft: '4px' }}>⚠</span>}
                              </span>
                            ) : (
                              <span style={isLightTheme ? { color: '#D4B8D9' } : { color: 'rgba(255,255,255,0.2)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div
                    className="text-center font-mono text-[11px] text-[rgba(255,255,255,0.28)]"
                    style={isLightTheme ? { borderTop: '1px solid rgba(164,131,174,0.18)', padding: '14px 20px', color: '#B99CBE' } : { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}
                  >
                    Showing {contacts.length} of {contactsSummary.totalSynced} contacts · Enriched by{' '}
                    <span style={isLightTheme ? { color: '#9A6FA8' } : { color: 'rgba(24,218,214,0.88)' }}>lead_qualifier</span>
                    {' & '}
                    <span style={isLightTheme ? { color: '#9A6FA8' } : { color: 'rgba(24,218,214,0.88)' }}>churn_predictor</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && activeContactsLever === 'pipeline' && (
              <div>
                {pipelineCols.length === 0 ? (
                  <GlassCard className="mb-6 px-6 py-8 border-[rgba(214,174,62,0.3)] bg-[rgba(90,62,10,0.18)] text-center"
                    style={isLightTheme ? { background: 'rgba(185,156,190,0.12)', borderColor: 'rgba(164,131,174,0.25)' } : undefined}>
                    <div className="font-mono text-[10px] tracking-[3px] text-[rgba(255,210,90,0.72)] uppercase mb-2"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      No Pipeline Data
                    </div>
                    <div className="text-[13px] text-[rgba(200,220,245,0.55)]"
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                      Pipeline stages will appear after contacts are synced and classified.
                    </div>
                  </GlassCard>
                ) : null}

                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Sales Pipeline
                  </div>
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.5px]"
                    style={isLightTheme ? {
                      border: '1px solid rgba(143,107,151,0.6)',
                      background: 'rgba(185,156,190,0.2)',
                      color: '#8F6B97',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(143,107,151,0.25), inset 0 1px 0 rgba(143,107,151,0.15)',
                    } : {
                      border: '1px solid rgba(214,174,62,0.6)',
                      background: 'rgba(90,62,10,0.55)',
                      color: 'rgba(255,210,90,0.97)',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(200,160,40,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    {contactsSummary.pipelineValue} Pipeline Value
                  </div>
                </div>

                {/* Kanban columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
                  {pipelineCols.map((col) => (
                    <div
                      key={col.stage}
                      className="rounded-2xl overflow-hidden"
                      style={isLightTheme ? {
                        background: 'rgba(248,242,252,0.6)',
                        border: `1px solid rgba(164,131,174,0.2)`,
                        boxShadow: 'none',
                      } : {
                        background: '#080e18',
                        border: `1px solid ${col.borderColor}`,
                        boxShadow: col.glow,
                      }}
                    >
                      {/* Column header */}
                      <div style={isLightTheme ? { padding: '14px 16px 10px', borderBottom: '1px solid rgba(164,131,174,0.18)' } : { padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="font-mono text-[9px] tracking-[2px] uppercase mb-2" style={isLightTheme ? { color: '#A483AE' } : { color: col.headerColor }}>
                          {col.stage} · {col.count}
                        </div>
                        <div className="font-bold text-[22px] leading-none" style={isLightTheme ? { color: '#8F6B97' } : { color: col.valueColor }}>
                          {col.value}
                        </div>
                      </div>

                      {/* Lead rows */}
                      <div style={{ padding: '8px 0' }}>
                        {col.leads.map((lead, i) => (
                          <div
                            key={i}
                            className="font-mono text-[10px]"
                            style={{
                              padding: '7px 16px',
                              color: isLightTheme ? '#8F6B97' : 'rgba(190,215,245,0.65)',
                              borderBottom: i < col.leads.length - 1 ? isLightTheme ? '1px solid rgba(164,131,174,0.12)' : '1px solid rgba(255,255,255,0.04)' : undefined,
                            }}
                          >
                            {lead.company}
                            <span style={isLightTheme ? { color: '#D4B8D9', margin: '0 5px' } : { color: 'rgba(255,255,255,0.28)', margin: '0 5px' }}>·</span>
                            Score {lead.score}
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div
                        className="font-mono text-[9px] text-center"
                        style={{
                          padding: '8px 16px 12px',
                          color: isLightTheme ? '#B99CBE' : 'rgba(255,255,255,0.25)',
                          borderTop: isLightTheme ? '1px solid rgba(164,131,174,0.12)' : '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        +{col.more} more
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contacts' && activeContactsLever === 'segments' && (
              <div>
                {segments.length === 0 ? (
                  <GlassCard className="mb-6 px-6 py-8 border-[rgba(14,200,198,0.18)] bg-[rgba(14,124,123,0.07)] text-center"
                    style={isLightTheme ? { background: 'rgba(185,156,190,0.12)', borderColor: 'rgba(164,131,174,0.25)' } : undefined}>
                    <div className="font-mono text-[10px] tracking-[3px] text-[rgba(14,200,198,0.6)] uppercase mb-2"
                      style={isLightTheme ? { color: '#8F6B97' } : undefined}>
                      No Segments Yet
                    </div>
                    <div className="text-[13px] text-[rgba(200,220,245,0.55)]"
                      style={isLightTheme ? { color: '#B99CBE' } : undefined}>
                      Segments are created automatically from live contact attributes and agent scoring.
                    </div>
                  </GlassCard>
                ) : null}

                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase"
                    style={isLightTheme ? { color: '#A483AE' } : undefined}>
                    Segments
                  </div>
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.6px]"
                    style={isLightTheme ? {
                      border: '1px solid rgba(143,107,151,0.6)',
                      background: 'rgba(185,156,190,0.2)',
                      color: '#8F6B97',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(143,107,151,0.25), 0 0 28px rgba(143,107,151,0.12), inset 0 1px 0 rgba(143,107,151,0.15)',
                    } : {
                      border: '1px solid rgba(14,210,208,0.72)',
                      background: 'rgba(4,62,72,0.72)',
                      color: 'rgba(24,228,226,0.97)',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(14,180,176,0.45), 0 0 28px rgba(14,180,176,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                  >
                    {contactsSummary.activeSegments} Active
                  </div>
                </div>

                {/* Table */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={isLightTheme ? { background: 'rgba(248,242,252,0.6)', border: '1px solid rgba(164,131,174,0.2)', boxShadow: 'none' } : { background: '#080e18', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={isLightTheme ? { borderBottom: '1px solid rgba(164,131,174,0.2)' } : { borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['SEGMENT', 'CONTACTS', 'CRITERIA', 'LAST UPDATED', 'ACTIONS'].map((col) => (
                          <th
                            key={col}
                            className="text-left font-mono text-[8.5px] tracking-[2px] uppercase font-normal"
                            style={{
                              color: isLightTheme ? '#A483AE' : 'rgba(255,255,255,0.28)',
                              padding: '14px 14px',
                              paddingLeft: col === 'SEGMENT' ? '24px' : '14px',
                              paddingRight: col === 'ACTIONS' ? '24px' : '14px',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {segments.map((seg, idx) => (
                        <tr
                          key={seg.id}
                          style={idx < segments.length - 1 ? { borderBottom: isLightTheme ? '1px solid rgba(164,131,174,0.12)' : '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Segment name */}
                          <td style={{ padding: '16px 14px 16px 24px', fontSize: '13px', fontWeight: 600, color: isLightTheme ? '#6B4F72' : 'rgba(230,242,255,0.94)', whiteSpace: 'nowrap' }}>
                            {seg.name}
                          </td>

                          {/* Contacts count */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: isLightTheme ? '#8F6B97' : seg.contactsAlert ? 'rgba(240,80,80,0.95)' : 'rgba(200,220,245,0.75)' }}>
                            {seg.contacts}
                          </td>

                          {/* Criteria */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '11px', color: isLightTheme ? '#8F6B97' : 'rgba(190,210,240,0.5)' }}>
                            {seg.criteria}
                          </td>

                          {/* Last updated */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '11px', color: isLightTheme ? '#8F6B97' : 'rgba(190,210,240,0.5)' }}>
                            {seg.lastUpdated}
                          </td>

                          {/* Action button */}
                          <td style={{ padding: '16px 24px 16px 14px' }}>
                            <button
                              className="rounded-full font-mono text-[11px] font-semibold transition-all duration-150"
                              style={isLightTheme ? {
                                border: '1px solid rgba(143,107,151,0.35)',
                                background: 'rgba(185,156,190,0.08)',
                                color: '#8F6B97',
                                padding: '6px 16px',
                              } : seg.actionVariant === 'gold'
                                ? { border: '1px solid rgba(214,174,62,0.55)', background: 'rgba(214,174,62,0.18)', color: 'rgba(255,210,90,0.97)', padding: '6px 16px' }
                                : { border: '1px solid rgba(14,200,198,0.5)', background: 'rgba(14,160,156,0.22)', color: 'rgba(24,222,220,0.97)', padding: '6px 16px' }
                              }
                            >
                              {seg.action}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SETTINGS: BILLING ─────────────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'billing' && (
              <div>
                {billingHistory.length === 0 ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]">
                      Billing history is unavailable.
                    </div>
                  </GlassCard>
                ) : null}

                <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                  {/* Left column */}
                  <div className="flex flex-col gap-3.5" style={{ width: 360, flexShrink: 0 }}>
                    {/* Plan card — gold variant */}
                    <GlassCard variant="gold" className="p-[22px]">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="font-display text-[20px] font-bold tracking-[2px] text-[rgba(255,210,100,0.95)] uppercase">Enterprise</div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[rgba(30,165,80,0.15)] border border-[rgba(30,165,80,0.35)] font-mono text-[9px] text-[rgba(30,165,80,0.85)] tracking-[1px]">Active</span>
                      </div>
                      <div className="flex items-baseline gap-0.5 mb-2">
                        <span className="font-display text-[36px] font-bold text-[rgba(255,210,100,0.9)] leading-none">$499</span>
                        <span className="font-sans text-sm text-[rgba(255,255,255,0.4)]">/mo</span>
                      </div>
                      <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-[0.5px] mb-4">Microsoft Marketplace · Renews May 12, 2026</div>

                      {/* Usage bars */}
                      <div className="space-y-2.5 mb-5">
                        {/* Agent Runs — warn (amber) at 68% */}
                        <div>
                          <div className="flex justify-between font-mono text-[9px] text-[rgba(255,255,255,0.35)] mb-[5px]">
                            <span>Agent Runs</span><span>34,210 / 50,000</span>
                          </div>
                          <div className="h-[5px] rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full rounded-[3px] bg-gradient-to-r from-[rgba(201,168,76,0.7)] to-[rgba(255,200,80,0.9)]" style={{ width: '68%' }} />
                          </div>
                        </div>
                        {/* Team Members — teal */}
                        <div>
                          <div className="flex justify-between font-mono text-[9px] text-[rgba(255,255,255,0.35)] mb-[5px]">
                            <span>Team Members</span><span>4 / 25</span>
                          </div>
                          <div className="h-[5px] rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full rounded-[3px] bg-gradient-to-r from-[rgba(14,124,123,0.7)] to-[rgba(14,200,198,0.9)]" style={{ width: '16%' }} />
                          </div>
                        </div>
                        {/* KB Storage — teal */}
                        <div>
                          <div className="flex justify-between font-mono text-[9px] text-[rgba(255,255,255,0.35)] mb-[5px]">
                            <span>KB Storage</span><span>2.4 GB / 50 GB</span>
                          </div>
                          <div className="h-[5px] rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div className="h-full rounded-[3px] bg-gradient-to-r from-[rgba(14,124,123,0.7)] to-[rgba(14,200,198,0.9)]" style={{ width: '5%' }} />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => window.location.href = '/api/billing/plans'}
                          className="px-3 py-[5px] rounded-[20px] font-sans text-[11px] font-bold tracking-[0.5px] transition-all bg-gradient-to-br from-[rgba(201,168,76,0.6)] to-[rgba(80,55,10,0.8)] text-[rgba(255,210,100,1)] border border-[rgba(201,168,76,0.45)] shadow-[0_4px_14px_rgba(0,0,0,0.35),0_0_16px_rgba(201,168,76,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_28px_rgba(201,168,76,0.35)]"
                        >
                          Manage Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.info('Invoice download is managed via Microsoft Marketplace billing portal.')}
                          className="px-3 py-[5px] rounded-[20px] font-sans text-[11px] font-bold tracking-[0.5px] transition-all bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.45)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.7)]"
                        >
                          Download Invoice
                        </button>
                      </div>
                    </GlassCard>

                    {/* Platform Status card — teal tint */}
                    <GlassCard className="p-4" style={{ background: 'rgba(14,124,123,0.06)', borderColor: 'rgba(14,124,123,0.25)' }}>
                      <div className="font-mono text-[9px] tracking-[2px] text-[rgba(14,200,198,0.55)] uppercase mb-2">Platform Status</div>
                      <div className="flex flex-col gap-1.5">
                        {platformStatuses.map(({ name, status }) => (
                          <div key={name} className="flex items-center justify-between">
                            <span className="font-mono text-[9.5px] text-[rgba(255,255,255,0.5)]">{name}</span>
                            <span className="font-mono text-[9.5px] text-[rgba(30,165,80,0.85)]">● {status}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Right column: Billing History */}
                  <div className="flex-1">
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Billing History</div>
                      </div>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[rgba(255,255,255,0.08)]">
                            {['Date','Amount','Status','Invoice'].map(h => (
                              <th key={h} className="text-left font-mono text-[8.5px] tracking-[2px] text-[rgba(255,255,255,0.28)] uppercase pb-2 pr-3 last:pr-0">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {billingHistory.map(({ date, amount, status }) => (
                            <tr key={date} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                              <td className="font-mono text-[10.5px] text-[rgba(255,255,255,0.62)] py-2.5 pr-3">{date}</td>
                              <td className="font-mono text-[10.5px] text-[rgba(255,255,255,0.62)] py-2.5 pr-3">{amount}</td>
                              <td className="py-2.5 pr-3">
                                <span className="font-mono text-[10px] text-[rgba(30,165,80,0.85)]">{status}</span>
                              </td>
                              <td className="py-2.5">
                                <button
                                  type="button"
                                  className="px-3 py-[5px] rounded-[20px] font-sans text-[10px] font-bold bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.7)] transition-all"
                                >
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </GlassCard>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && activeSettingsLever === 'team' && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Team Members</div>
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(v => !v)}
                    className="px-3 py-[5px] rounded-[20px] font-sans text-[11px] font-bold tracking-[0.5px] transition-all bg-gradient-to-br from-[rgba(14,124,123,0.7)] to-[rgba(0,60,60,0.8)] text-[rgba(14,200,198,1)] border border-[rgba(14,124,123,0.5)] shadow-[0_4px_14px_rgba(0,0,0,0.35),0_0_18px_rgba(14,124,123,0.25)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_28px_rgba(14,124,123,0.45)]"
                  >
                    + Invite Member
                  </button>
                </div>

                {/* Invite form (inline, shown when toggled) */}
                {showInviteForm && (
                  <GlassCard className="p-4 mb-3.5 border-[rgba(14,124,123,0.28)]">
                    <div className="font-mono text-[9px] tracking-[2px] text-[rgba(14,200,198,0.6)] uppercase mb-3">Invite by Email</div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void handleInviteMember(); }}
                        placeholder="colleague@company.com"
                        className="flex-1 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 font-mono text-[12px] text-[rgba(255,255,255,0.85)] placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(14,200,198,0.45)]"
                      />
                      <button
                        type="button"
                        onClick={() => void handleInviteMember()}
                        disabled={inviteLoading}
                        className="px-4 py-2 rounded-lg border border-[rgba(14,200,198,0.45)] bg-[rgba(14,124,123,0.3)] font-mono text-[11px] font-bold text-[rgba(14,200,198,1)] hover:bg-[rgba(14,124,123,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {inviteLoading ? 'Sending…' : 'Send'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowInviteForm(false); setInviteEmail(''); }}
                        className="px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-transparent font-mono text-[11px] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </GlassCard>
                )}

                <GlassCard className="p-4">
                  {orgMembers.length === 0 ? (
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] text-center py-6">Loading team members…</div>
                  ) : (
                    orgMembers.map((member, idx) => {
                      const isOwner  = member.role === 'Owner';
                      const isAdmin  = member.role === 'Admin';
                      const roleStyle = isOwner
                        ? 'text-[rgba(255,210,100,0.85)] border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.12)]'
                        : isAdmin
                        ? 'text-[rgba(14,200,198,0.8)] border-[rgba(14,124,123,0.3)] bg-[rgba(14,124,123,0.12)]'
                        : 'text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]';
                      const avatarBg = isOwner
                        ? 'linear-gradient(135deg,rgba(201,168,76,.5),rgba(80,50,0,.8))'
                        : isAdmin
                        ? 'linear-gradient(135deg,rgba(14,124,123,.5),rgba(0,40,50,.8))'
                        : 'linear-gradient(135deg,rgba(100,50,180,.4),rgba(30,10,60,.8))';
                      const avatarBorder = isOwner
                        ? 'rgba(201,168,76,0.4)'
                        : isAdmin
                        ? 'rgba(14,124,123,0.4)'
                        : 'rgba(100,50,180,0.35)';
                      return (
                        <div key={member.id} className={`flex items-center justify-between py-3 ${idx > 0 ? 'border-t border-[rgba(255,255,255,0.05)]' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                              style={{ border: `1.5px solid ${avatarBorder}`, background: avatarBg }}
                            >
                              <span style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.9)' }}>{member.initials}</span>
                            </div>
                            <div>
                              <div className="font-sans text-[13px] font-semibold text-[rgba(255,255,255,0.85)]">{member.name}</div>
                              <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.28)] mt-0.5">{member.email}</div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-[3px] rounded-[12px] border font-mono text-[8.5px] tracking-[0.5px] ${roleStyle}`}>
                            {member.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </GlassCard>
              </div>
            )}

            {/* ── SETTINGS: INTEGRATIONS ───────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'integrations' && (
              <div>
                {integrationRows.length === 0 ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]">
                      No integrations configured yet.
                    </div>
                  </GlassCard>
                ) : null}

                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Integrations</div>
                  <span className="px-2.5 py-[3px] rounded-[20px] bg-[rgba(14,124,123,0.12)] border border-[rgba(14,124,123,0.28)] font-mono text-[8.5px] text-[rgba(14,200,198,0.7)] tracking-[1px]">{connectedIntegrations}/{integrationRows.length} Connected</span>
                </div>

                <GlassCard className="p-4">
                  {integrationRows.map(({ icon, name, desc, statusText, dotColor, textColor }, idx) => {
                    const actionState = getIntegrationActionState(name, statusText);
                    return (
                    <div key={name} className={`flex items-center justify-between py-3 ${idx > 0 ? 'border-t border-[rgba(255,255,255,0.05)]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.09)] flex items-center justify-center text-[18px] flex-shrink-0">
                          {icon}
                        </div>
                        <div>
                          <div className="font-sans text-[13px] font-semibold text-[rgba(255,255,255,0.85)]">{name}</div>
                          <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.28)] mt-[1px]">{desc}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <IntegrationActionButton
                          label={actionState.label}
                          onClick={() => handleIntegrationAction(name, statusText)}
                          loading={integrationActionLoading === name}
                          disabled={!actionState.enabled}
                        />
                        <div className="flex items-center gap-[5px] font-mono text-[9px]" style={{ color: textColor }}>
                          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                          {statusText}
                        </div>
                      </div>
                    </div>
                  );})}
                </GlassCard>
              </div>
            )}

            {activeTab === 'settings' && activeSettingsLever === 'cms' && (
              <CMSConnections embedded isLightTheme={isLightTheme} />
            )}

            {/* ── SETTINGS: SECURITY ───────────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'security' && (
              <div>
                {tevvControls.length === 0 || authItems.length === 0 ? (
                  <GlassCard className="mb-4 px-5 py-4 border-[rgba(255,255,255,0.1)]">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)] uppercase tracking-[2px]">
                      Security controls are not available yet.
                    </div>
                  </GlassCard>
                ) : null}

                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Security &amp; Compliance</div>
                  <span className="px-2.5 py-[3px] rounded-[20px] bg-[rgba(14,124,123,0.12)] border border-[rgba(14,124,123,0.28)] font-mono text-[8.5px] text-[rgba(14,200,198,0.7)] tracking-[1px]">NIST TEVV {tevvScore}/100</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* TEVV Controls */}
                  <GlassCard className="p-4">
                    <div className="font-mono text-[9px] tracking-[2px] text-[rgba(14,200,198,0.55)] uppercase mb-3">TEVV Controls</div>
                    <div className="flex flex-col gap-2">
                      {tevvControls.map(({ code, detail }, idx) => (
                        <div key={code} className={`flex items-center justify-between py-2 ${idx > 0 ? 'border-t border-[rgba(255,255,255,0.05)]' : ''}`}>
                          <div className="flex items-start gap-2.5">
                            <span className="text-[rgba(30,165,80,0.85)] text-[14px] mt-0.5 flex-shrink-0">✓</span>
                            <div>
                              <div className="font-sans text-[12px] text-[rgba(255,255,255,0.8)]">{code}</div>
                              <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.3)] mt-0.5">{detail}</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-[10px] bg-[rgba(30,165,80,0.12)] border border-[rgba(30,165,80,0.3)] font-mono text-[8px] text-[rgba(30,165,80,0.85)] tracking-[1px] flex-shrink-0 ml-3">PASS</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Authentication */}
                  <GlassCard className="p-4">
                    <div className="font-mono text-[9px] tracking-[2px] text-[rgba(201,168,76,0.55)] uppercase mb-3">Authentication</div>
                    <div className="flex flex-col gap-2.5">
                      {authItems.map(({ name, detail, badge }) => (
                        <div key={name} className="flex items-center justify-between">
                          <div>
                            <div className="font-sans text-[12px] text-[rgba(255,255,255,0.8)]">{name}</div>
                            <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.3)] mt-0.5">{detail}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-[10px] bg-[rgba(30,165,80,0.12)] border border-[rgba(30,165,80,0.3)] font-mono text-[8px] text-[rgba(30,165,80,0.85)] tracking-[0.5px] flex-shrink-0 ml-3">{badge}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="px-5 py-2 bg-[rgba(0,0,0,0.42)] border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.3)]">
                <span className="text-[rgba(14,200,198,0.75)]">{runningAgents.length}</span> Active
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.3)]">
                <span className="text-[rgba(14,200,198,0.75)]">{String(testsPassedLabel).split('/')[0]}</span> Tests Passing
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.3)]">
                Uptime: <span className="text-[rgba(14,200,198,0.75)]">99.8%</span>
              </div>
            </div>
            <div className="font-mono text-[8px] text-[rgba(255,255,255,0.16)] tracking-[1px]">
              BUILD: v16.4.1-apex · DEPLOYED: Vercel · REGION: us-east-1
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Social Post Modal — rendered via portal to document.body ── */}
      {editSocialPost !== null && typeof document !== 'undefined' && createPortal(
        <div
          aria-hidden="false"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Overlay */}
          <div
            aria-hidden="true"
            onClick={closeSocialEdit}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(1, 4, 12, 0.86)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Dialog — compact 520px card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit social post"
            className="relative z-10 flex flex-col rounded-2xl border border-[rgba(14,124,123,0.4)] shadow-[0_20px_56px_rgba(0,0,0,0.8),0_0_24px_rgba(14,124,123,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{ background: '#050A14', width: '100%', maxWidth: '520px', maxHeight: '82vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-[rgba(255,255,255,0.07)]">
              <div>
                <div className="font-mono text-[9px] tracking-[2.4px] text-[rgba(14,200,198,0.65)] uppercase mb-1">
                  Edit Post
                </div>
                <div className="text-[rgba(220,236,255,0.93)] font-semibold text-[13px] leading-tight">
                  {editSocialPost.channel}
                  <span className="mx-1.5 text-[rgba(255,255,255,0.2)]">·</span>
                  <span className="font-mono text-[11px] text-[rgba(14,200,198,0.78)]">{editSocialPost.handle}</span>
                </div>
              </div>
              <button
                onClick={closeSocialEdit}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[rgba(160,182,210,0.7)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-all duration-150"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Meta strip */}
            <div className="px-5 pt-2.5 pb-1.5 flex items-center gap-2 flex-wrap border-b border-[rgba(255,255,255,0.04)]">
              {editSocialPost.bias !== null && (
                <span className="rounded-full border border-[rgba(14,200,198,0.22)] bg-[rgba(14,200,198,0.07)] px-2 py-0.5 font-mono text-[8.5px] tracking-[0.8px] text-[rgba(14,200,198,0.78)] uppercase">
                  BIAS {editSocialPost.bias}
                </span>
              )}
              <span className="rounded-full border border-[rgba(210,228,255,0.15)] bg-[rgba(210,228,255,0.04)] px-2 py-0.5 font-mono text-[8.5px] tracking-[0.8px] text-[rgba(170,192,235,0.6)] uppercase">
                {editSocialPost.model}
              </span>
              <span className="font-mono text-[8.5px] text-[rgba(190,208,240,0.3)]">
                {editSocialPost.generatedAgo}
              </span>
            </div>

            {/* Textarea */}
            <div className="px-5 py-4 flex-1 overflow-auto">
              <div className="relative">
                <textarea
                  value={editSocialBody}
                  onChange={e => setEditSocialBody(e.target.value)}
                  rows={7}
                  spellCheck
                  autoFocus
                  className="w-full resize-none rounded-xl border border-[rgba(14,124,123,0.3)] bg-[rgba(2,6,16,0.97)] px-4 py-3 font-mono text-[11px] leading-[1.8] text-[rgba(215,232,255,0.84)] placeholder-[rgba(130,155,190,0.32)] outline-none focus:border-[rgba(14,200,198,0.5)] focus:ring-1 focus:ring-[rgba(14,200,198,0.18)] transition-all duration-150"
                  placeholder="Write your LinkedIn post here…"
                  aria-label="Post content"
                />
                <div className="absolute bottom-2 right-3 font-mono text-[8.5px] text-[rgba(130,155,190,0.38)]">
                  {editSocialBody.trim().length}
                </div>
              </div>
              <p className="mt-1.5 font-mono text-[8.5px] text-[rgba(130,155,190,0.35)] leading-relaxed">
                Blank line = new paragraph · edits update the card instantly
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[rgba(255,255,255,0.07)]">
              <button
                onClick={closeSocialEdit}
                disabled={editSocialSaving}
                className="rounded-full border border-[rgba(210,228,255,0.2)] bg-transparent px-4 py-1.5 text-[10.5px] font-medium text-[rgba(195,215,245,0.68)] hover:bg-[rgba(210,228,255,0.08)] hover:text-white transition-all duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleEditSocialSave(); }}
                disabled={editSocialSaving || !editSocialBody.trim()}
                aria-busy={editSocialSaving}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(14,200,198,0.52)] bg-[rgba(14,155,152,0.28)] px-5 py-1.5 text-[10.5px] font-semibold text-[rgba(20,224,220,0.96)] shadow-[0_0_12px_rgba(14,180,176,0.2)] hover:bg-[rgba(14,155,152,0.44)] hover:border-[rgba(14,200,198,0.76)] hover:shadow-[0_0_18px_rgba(14,180,176,0.35)] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSocialSaving && (
                  <span aria-hidden="true" className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
                )}
                {editSocialSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
