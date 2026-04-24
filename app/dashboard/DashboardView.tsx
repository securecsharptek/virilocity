// ─────────────────────────────────────────────────────────────────────────────
// DashboardClient — V16.4 Glassmorphic Dashboard UI
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/layout/DashboardHeader';
import TabButton from '../../components/ui/TabButton';
import Lever from '../../components/ui/Lever';
import KPICard from '../../components/ui/KPICard';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import ActivityFeed, { type FeedItem } from '../../components/ui/ActivityFeed';
import ToastContainer, { useToast } from '../../components/ui/Toast';

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
  status: 'scheduled' | 'hitl';
};

const AUTOPILOT_TASKS: TaskScheduleItem[] = [
  { agent: 'content_strategist', task: 'Plan 7-day content', model: 'Sonnet', status: 'scheduled' },
  { agent: 'blog_writer', task: 'Generate 2 articles', model: 'Sonnet', status: 'scheduled' },
  { agent: 'seo_optimizer', task: 'Refresh 10 meta tags', model: 'Haiku', status: 'scheduled' },
  { agent: 'linkedin_poster', task: 'Post 3 updates', model: 'Haiku', status: 'scheduled' },
  { agent: 'reddit_manager', task: 'Draft community post', model: 'Haiku', status: 'hitl' },
  { agent: 'email_campaigner', task: 'Drip to new leads', model: 'Sonnet', status: 'scheduled' },
  { agent: 'churn_predictor', task: 'Score all accounts', model: 'Opus', status: 'scheduled' },
  { agent: 'lead_qualifier', task: 'Score new HS contacts', model: 'Haiku', status: 'scheduled' },
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

const HITL_QUEUE_ITEMS: HITLQueueItem[] = [
  {
    id: '1',
    subreddit: 'r/SaaSMarketing',
    title: 'How We Cut CAC by 48% with AI Agents',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: "We've been running an AI agent stack for 90 days now. Here's what actually moved the needle on CAC: automated lead scoring cut unqualified demos by 58% · content agents CRUSHED our content team meltdown by 2x/day, and email grooming plugged an ugly abandon % bonus early. Happy to share the full breakdown...",
  },
  {
    id: '2',
    subreddit: 'r/ArtificialIntelligence',
    title: 'Fairness Filtering in Production AI Agents',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: 'Running HIST TSEV-aligned Fairness Filters on LLM outputs at scale. Our setup: ContentFairnessFilter runs on every agent output, cutting > LLM scores & bias categories. Only outputs scoring >70 pass. We log every audit with an expdate for compliance. Works a ton open implementation patterns.',
  },
  {
    id: '3',
    subreddit: 'r/Startups',
    title: 'Enterprise SaaS Lessons from Year 2',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: "Year 2 of building a B2B SaaS for marketing teams. Three things I wish I'd known: (1) Enterprise contracts take 3-5 months to close, budget accordingly; (2) Microsoft partner status opens procurement doors you didn't even know existed; (3) SAML SSO isn't just a feature, it's THE key for 5-figure+ ACVs.",
  },
];

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
  status: 'scheduled' | 'hitl';
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
}

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

const ANALYTICS_CHANNELS = [
  { name: 'Organic Search', visits: '5,840', share: 47, accent: 'teal' as const },
  { name: 'Direct', visits: '2,400', share: 20, accent: 'teal' as const },
  { name: 'LinkedIn (AI agent)', visits: '1,860', share: 15, accent: 'teal' as const },
  { name: 'Email (agent)', visits: '1,240', share: 10, accent: 'teal' as const },
  { name: 'Reddit (HITL)', visits: '980', share: 8, accent: 'gold' as const },
];

const ANALYTICS_TOP_PAGES = [
  { page: '/blog/ai-marketing-agents-2026', visits: '2,140', avgPosition: '3.2', ctr: '12.8%', generatedBy: 'blog_writer' },
  { page: '/blog/saas-cac-reduction', visits: '1,820', avgPosition: '5.4', ctr: '9.4%', generatedBy: 'blog_writer' },
  { page: '/features/autopilot', visits: '1,240', avgPosition: '8.1', ctr: '6.2%', generatedBy: 'Manual' },
  { page: '/blog/content-fairness-ai', visits: '980', avgPosition: '11.3', ctr: '4.8%', generatedBy: 'blog_writer' },
  { page: '/pricing', visits: '840', avgPosition: '—', ctr: '—', generatedBy: 'Manual' },
];

type FunnelStage = {
  label: string;
  count: number;
  percentage: number;
  dropoff?: number;
};

const CONVERSION_FUNNEL: FunnelStage[] = [
  { label: 'Visitors', count: 12400, percentage: 100 },
  { label: 'Sign-ups', count: 1017, percentage: 8.2, dropoff: 91.8 },
  { label: 'Trial Users', count: 284, percentage: 2.3, dropoff: 72.0 },
  { label: 'Paid Customers', count: 88, percentage: 0.7, dropoff: 69.0 },
];

type RevenueSegment = {
  tier: string;
  revenue: number;
  percentage: number;
  color: string;
};

const REVENUE_BREAKDOWN: RevenueSegment[] = [
  { tier: 'Enterprise', revenue: 4000, percentage: 50, color: 'rgba(255,210,100,0.9)' },
  { tier: 'Pro', revenue: 2640, percentage: 32, color: 'rgba(14,200,198,0.85)' },
  { tier: 'Starter', revenue: 300, percentage: 10, color: 'rgba(100,150,180,0.75)' },
];

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

const AB_TESTS: ABTest[] = [
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
];

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

const KNOWLEDGE_BASE_DOCS: KnowledgeDoc[] = [
  {
    id: '1',
    category: 'product-docs',
    title: 'Virilocity Platform Overview',
    words: '4,280 words',
    updated: 'Updated 2d ago',
    actionLabel: 'Re-train',
  },
  {
    id: '2',
    category: 'product-docs',
    title: '39 Agent Capabilities Guide',
    words: '8,640 words',
    updated: 'Updated today',
    actionLabel: 'Re-train',
  },
  {
    id: '3',
    category: 'brand',
    title: 'Brand Voice & Tone Guidelines',
    words: '2,100 words',
    updated: 'Updated 5d ago',
    actionLabel: 'Edit',
  },
  {
    id: '4',
    category: 'competitor-intel',
    title: 'Market Landscape Analysis',
    words: '6,320 words',
    updated: 'Updated 1w ago',
    actionLabel: 'Re-train',
  },
  {
    id: '5',
    category: 'product-docs',
    title: 'Pricing & Tier Comparison',
    words: '1,840 words',
    updated: 'Updated 3d ago',
    actionLabel: 'Re-train',
  },
];

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
};

const SOCIAL_POSTS: SocialPost[] = [
  {
    id: '1',
    channel: 'LINKEDIN',
    handle: 'linkedin_poster',
    generatedAgo: 'Generated 1h ago',
    bias: '88.2',
    model: 'Sonnet',
    body: [
      '🚀 We just hit 284 leads this week — all generated by our AI agent stack.',
      'The breakdown: blog_writer → SEO traffic, lead_qualifier → scores in HubSpot, email_campaigner → nurture sequences. Human effort: reviewing HITL-gated content (15 min/day).',
      'The ROI math is starting to make a lot of sense. What\'s your experience with AI-assisted marketing? 👇 #AI #SaaS #Marketing',
    ],
    primaryAction: 'Post Now',
    secondaryAction: 'Edit',
  },
  {
    id: '2',
    channel: 'EMAIL SUBJECT',
    handle: 'email_campaigner',
    generatedAgo: 'Generated 2h ago',
    bias: null,
    model: 'Haiku',
    body: [
      'Subject: "Your AI marketing team ran 34 tasks while you slept"',
      'Preview: See what your agents accomplished overnight...',
    ],
    primaryAction: 'Send',
    secondaryAction: 'A/B Test',
  },
];

type BlogArticle = {
  id: string;
  title: string;
  words: string;
  bias: string;
  published: string | null;
  visits: string | null;
  action: 'Preview' | 'View';
};

const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: '1',
    title: '10 AI Marketing Trends for 2025',
    words: '1,240',
    bias: '84.2',
    published: null,
    visits: null,
    action: 'Preview',
  },
  {
    id: '2',
    title: 'How We Cut CAC by 40% with AI Agents',
    words: '2,180',
    bias: '81.0',
    published: 'Apr 10',
    visits: '2,140',
    action: 'View',
  },
  {
    id: '3',
    title: 'Content Fairness in Production AI',
    words: '1,640',
    bias: '88.5',
    published: 'Apr 7',
    visits: '980',
    action: 'View',
  },
  {
    id: '4',
    title: 'B2B Marketing Automation: Complete Guide',
    words: '3,400',
    bias: '92.1',
    published: 'Apr 3',
    visits: '1,820',
    action: 'View',
  },
];

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

const SEGMENTS: Segment[] = [
  { id: '1', name: 'At-Risk Customers',    contacts: 3,  contactsAlert: true,  criteria: 'Churn score <0.3',        lastUpdated: '31m ago', action: 'Email Campaign', actionVariant: 'teal' },
  { id: '2', name: 'High-Value SQLs',      contacts: 12, contactsAlert: false, criteria: 'Score >80 & stage=SQL',   lastUpdated: '3h ago',  action: 'Email Campaign', actionVariant: 'teal' },
  { id: '3', name: 'Trial Users · Day 7',  contacts: 28, contactsAlert: false, criteria: 'Trial, joined 7d ago',    lastUpdated: 'Daily',   action: 'Drip Sequence',  actionVariant: 'teal' },
  { id: '4', name: 'Engaged MQLs',         contacts: 44, contactsAlert: false, criteria: 'Stage=MQL & 3+ visits',  lastUpdated: '6h ago',  action: 'Email Campaign', actionVariant: 'teal' },
  { id: '5', name: 'Enterprise Prospects', contacts: 8,  contactsAlert: false, criteria: 'Company size >200',       lastUpdated: '1d ago',  action: 'Sales Outreach', actionVariant: 'gold' },
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
    activeAgents: 12,
    postsGenerated: 47,
    leadsCaptured: 284,
    mrr: 8320,
  });
  const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
  const [autopilotTasks, setAutopilotTasks] = useState<TaskScheduleItem[]>(AUTOPILOT_TASKS);
  const [hitlQueueItems, setHitlQueueItems] = useState<HITLQueueItem[]>(HITL_QUEUE_ITEMS);
  const [agentCards, setAgentCards] = useState<AgentCard[]>(AGENT_CARDS);
  const [runningAgents, setRunningAgents] = useState<RunningAgent[]>(RUNNING_AGENTS);
  const [scheduledAgents, setScheduledAgents] = useState<ScheduledAgent[]>(SCHEDULED_AGENTS);
  const [lastRunSummary, setLastRunSummary] = useState({
    completedTasks: 34,
    postsCreated: 58,
    hitlPending: 3,
    durationText: '02:18',
  });

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
  };

  const refreshDashboardData = async (silent = true) => {
    try {
      const res = await fetch('/dashboard/data', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const data = (await res.json()) as DashboardApiResponse;
      applyDashboardData(data);
    } catch (error) {
      if (!silent) {
        const msg = error instanceof Error ? error.message : 'Failed to load dashboard data';
        toast.error(msg);
      }
    }
  };

  useEffect(() => {
    void refreshDashboardData(false);
    const poll = window.setInterval(() => {
      void refreshDashboardData(true);
    }, 5000);

    return () => window.clearInterval(poll);
  }, []);

  const postAction = async (action: string, id?: string) => {
    const res = await fetch('/dashboard/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id }),
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
      const result = await postAction(action, id);
      if (result.data) applyDashboardData(result.data);
      toast.success(action === 'approveHitl' ? 'Item approved and queued.' : 'Item rejected and removed from queue.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to process HITL action';
      toast.error(msg);
    }
  };

  return (
    <div className={`min-h-screen dashboard-theme dashboard-theme--${theme}`}>
      {/* Container with max-width */}
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 pb-10">
        {/* Header */}
        <DashboardHeader
          user={{ name: 'Keshav Choudhary', initials: 'KM' }}
          tenant="CloudOneSoftware LLC · Enterprise"
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
                <Lever label="Security"     active={activeSettingsLever === 'security'}     onClick={() => setActiveSettingsLever('security')} />
              </div>
            </div>
          )}
          {/* ── SETTINGS PLACEHOLDER — replace below with real sections ── */}
          {/* Content Area */}
          <div className="min-h-[560px] px-5 py-[22px] bg-gradient-to-b from-[rgba(0,8,20,0.58)] to-[rgba(0,4,12,0.4)]">
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
                    subtitle="Stripe · Enterprise tier"
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
                          Every 6-8 hrs · CRON: 0 */6 * * * · NEXT: 02:30 PM UTC
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
                            Posts created · Blog 34 · LinkedIn 24
                          </div>
                        </div>
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(201,168,76,0.12)] to-[rgba(55,35,0,0.08)] border border-[rgba(201,168,76,0.32)]">
                          <div className="font-display text-5xl font-bold text-[rgba(255,210,100,0.95)] mb-2 [text-shadow:0_0_24px_rgba(201,168,76,0.5)]">
                            {lastRunSummary.hitlPending}
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            HITL pending · Reddit 2 · Email 1
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
                                      : 'border-[rgba(100,50,180,0.38)] bg-[rgba(100,50,180,0.14)] text-[rgba(180,140,255,0.86)] shadow-[0_0_12px_rgba(100,50,180,0.14),inset_0_1px_0_rgba(255,255,255,0.08)]',
                                  ].join(' ')}
                                >
                                  {item.status === 'hitl' ? 'HITL Gate' : 'Scheduled'}
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
                          onClick={() => toast.info('Draft editing flow will be connected in the next pass.')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.045)] border-2 border-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.52)] font-semibold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.78)] hover:border-[rgba(255,255,255,0.22)] transition-all"
                        >
                          <span className="text-[15px]">←</span>
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

            {/* AGENTS TAB CONTENT - Updated */}
            {activeTab === 'agents' && activeAgentsLever === 'all' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    All Agents
                  </div>
                  <div className="flex gap-2.5">
                    <button className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)] hover:bg-[rgba(14,124,123,0.18)] transition-colors">
                      33 Running
                    </button>
                    <button className="rounded-full border border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(255,210,100,0.92)] shadow-[0_0_18px_rgba(201,168,76,0.15)] hover:bg-[rgba(201,168,76,0.18)] transition-colors">
                      5 HITL Gated
                    </button>
                    <button className="rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 font-mono text-[9px] text-[rgba(255,255,255,0.52)] shadow-[0_0_12px_rgba(0,0,0,0.15)] hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                      36 Idle
                    </button>
                  </div>
                </div>

                {/* Agent Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {agentCards.map((agent) => (
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
                  <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                    Showing 9 of 39 agents · <span className="text-[rgba(14,200,198,0.7)] cursor-pointer hover:text-[rgba(14,200,198,0.9)]">View all →</span>
                  </div>
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">◉ 33</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">000/000</span> tests pass
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">TEVV 96.4 /100</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">BIAS gate &gt;70</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,210,100,0.85)]">▲ 3</span> HITL pending
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">FinanceSoftware LLC · R: Kenneth Wells PTO → Jeremy City #2 · CDP guy → Microsoft Partner</span>
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS TAB - RUNNING SECTION */}
            {activeTab === 'agents' && activeAgentsLever === 'running' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    Currently Running
                  </div>
                  <div className="flex gap-2.5">
                    <button className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)] hover:bg-[rgba(14,124,123,0.18)] transition-colors">
                      {runningAgents.length} Active
                    </button>
                  </div>
                </div>

                {/* Running Agents List */}
                <div className="space-y-3 mb-6">
                  {runningAgents.map((agent) => (
                    <GlassCard key={agent.id} className="px-5 py-4 border-[rgba(255,255,255,0.08)] bg-[rgba(0,8,20,0.6)]">
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
                          <div className="font-[Rajdhani] text-[15px] font-bold text-[rgba(255,255,255,0.92)] mb-1.5 leading-tight">
                            {agent.name}
                          </div>
                          <div className="font-mono text-[10px] leading-relaxed text-[rgba(255,255,255,0.48)] pr-4">
                            {agent.taskDescription}
                          </div>
                        </div>

                        {/* Running Time Button */}
                        <div className="flex-shrink-0">
                          <button className="rounded-full border border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.14)] px-4 py-2 font-mono text-[9px] font-medium text-[rgba(14,200,198,0.94)] shadow-[0_0_14px_rgba(14,124,123,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(14,124,123,0.2)] transition-colors whitespace-nowrap">
                            RUNNING - {agent.runningTime}
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">◉ 12</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">000,000</span> tests pass
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">TEVV 96.4 /100</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">BIAS gate &gt;70</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,210,100,0.85)]">▲ 3</span> HITL pending
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">CloudOneSoftware LLC - Enterprise - R: #import Wells Keljo 503 - Jeremy City #2 - CDP guy - Microsoft Partner</span>
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS TAB - SCHEDULED SECTION */}
            {activeTab === 'agents' && activeAgentsLever === 'scheduled' && (
              <div>
                {/* Section Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    Scheduled Runs
                  </div>
                  <div className="flex gap-2.5">
                    <button className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.12)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)] hover:bg-[rgba(14,124,123,0.18)] transition-colors">
                      Next: 02:00 UTC
                    </button>
                  </div>
                </div>

                {/* Scheduled Agents Table */}
                <div className="mb-6 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(0,8,20,0.6)]">
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
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Name
                        </th>
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Schedule
                        </th>
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Next Run
                        </th>
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Model
                        </th>
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Est. Duration
                        </th>
                        <th className="px-5 py-3 text-left font-mono text-[9px] font-medium tracking-[2px] text-[rgba(255,255,255,0.35)] uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledAgents.map((agent) => (
                        <tr key={agent.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-[Rajdhani] text-[14px] font-semibold text-[rgba(255,255,255,0.88)]">
                              {agent.name}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[11px] text-[rgba(255,255,255,0.52)]">
                              {agent.schedule}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[11px] text-[rgba(14,200,198,0.85)]">
                              {agent.nextRun}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[11px] text-[rgba(14,200,198,0.75)]">
                              {agent.model}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[11px] text-[rgba(255,255,255,0.48)]">
                              {agent.estDuration}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {agent.status === 'scheduled' ? (
                              <button className="rounded-full border border-[rgba(100,50,180,0.35)] bg-[rgba(100,50,180,0.14)] px-3 py-1.5 font-mono text-[9px] font-medium text-[rgba(180,140,255,0.92)] shadow-[0_0_14px_rgba(100,50,180,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(100,50,180,0.2)] transition-colors">
                                Scheduled
                              </button>
                            ) : (
                              <button className="rounded-full border border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.14)] px-3 py-1.5 font-mono text-[9px] font-medium text-[rgba(255,210,100,0.92)] shadow-[0_0_14px_rgba(201,168,76,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[rgba(201,168,76,0.2)] transition-colors">
                                HITL Gate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Stats Bar */}
                <div className="mt-6 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">◉ 12</span> agents running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">000/000</span> tests pass
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">TEVV 96.4 /100</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">BIAS gate &gt;70</span>
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,210,100,0.85)]">▲ 3</span> HITL pending
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">FinanceSoftware LLC - R: #export Mello 246 - Jeremy City #2 - LCP guy - Microsoft Partner</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'traffic' && (
              <div>
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4 mb-4">
                  <GlassCard className="px-5 py-4 border-[rgba(14,124,123,0.32)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)]">
                        Site Traffic · 30 Days
                      </div>
                      <div className="px-2 py-[3px] rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] font-mono text-[8px] text-[rgba(14,200,198,0.88)]">
                        +18% MoM
                      </div>
                    </div>

                    <div className="h-[112px]">
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
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                      <div>
                        <div className="font-display text-[29px] leading-none text-[rgba(14,200,198,0.95)]">12.4K</div>
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Visitors</div>
                      </div>
                      <div>
                        <div className="font-display text-[29px] leading-none text-[rgba(255,255,255,0.86)]">3.2</div>
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Pages/Session</div>
                      </div>
                      <div>
                        <div className="font-display text-[29px] leading-none text-[rgba(255,255,255,0.86)]">2m 45s</div>
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Avg Duration</div>
                      </div>
                      <div>
                        <div className="font-display text-[29px] leading-none text-[rgba(30,165,80,0.9)]">38%</div>
                        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] mt-1">Bounce Rate</div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                    <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)] mb-3">
                      Traffic by Channel
                    </div>

                    <div className="space-y-3.5">
                      {ANALYTICS_CHANNELS.map((channel) => (
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
                      ))}
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[10px] tracking-[3px] uppercase text-[rgba(255,255,255,0.38)]">
                      Top Pages
                    </div>
                    <div className="px-2 py-[3px] rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] font-mono text-[8px] text-[rgba(14,200,198,0.88)]">
                      GSC Connected
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] table-fixed border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.08)]">
                          <th className="py-2.5 pr-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Page</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Visits</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Avg Position</th>
                          <th className="py-2.5 px-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">CTR</th>
                          <th className="py-2.5 pl-3 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Generated By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ANALYTICS_TOP_PAGES.map((row) => (
                          <tr key={row.page} className="border-b border-[rgba(255,255,255,0.05)]">
                            <td className="py-2.5 pr-3 font-[Rajdhani] text-[13px] font-semibold text-[rgba(235,245,255,0.9)]">{row.page}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]">{row.visits}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]">{row.avgPosition}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[rgba(255,255,255,0.68)]">{row.ctr}</td>
                            <td className="py-2.5 pl-3 font-mono text-[11px] text-[rgba(14,200,198,0.82)]">{row.generatedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'conversions' && (
              <div>
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
                      {CONVERSION_FUNNEL.map((stage, idx) => (
                        <div key={stage.label}>
                          {/* Funnel box */}
                          <div className="rounded-lg border-2 border-[rgba(14,124,123,0.5)] bg-gradient-to-r from-[rgba(14,124,123,0.25)] to-[rgba(14,124,123,0.12)] px-4 py-3.5 flex items-center justify-between group hover:border-[rgba(14,200,198,0.7)] transition-all">
                            <div className="flex-1">
                              <div className="font-mono text-[11px] text-[rgba(255,255,255,0.7)] font-semibold">
                                {stage.label}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-[28px] leading-none font-bold text-[rgba(14,200,198,0.95)]">
                                {stage.count.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Conversion indicator - shown below each box except the last */}
                          {stage.dropoff && idx < CONVERSION_FUNNEL.length - 1 && (
                            <div className="px-4 py-1.5 text-center">
                              <div className="font-mono text-[8.5px] text-[rgba(255,150,150,0.75)] tracking-wider">
                                ↓ {stage.dropoff}% dropoff
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Funnel Summary Metrics */}
                    <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)]">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="font-display text-[24px] leading-none font-bold text-[rgba(14,200,198,0.92)] mb-1">
                            0.71%
                          </div>
                          <div className="font-mono text-[8px] text-[rgba(255,255,255,0.35)] tracking-tight">
                            Overall Conv. Rate
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-display text-[24px] leading-none font-bold text-[rgba(30,165,80,0.85)] mb-1">
                            31%
                          </div>
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
                      {REVENUE_BREAKDOWN.map((segment) => (
                        <div key={segment.tier} className="space-y-1.5">
                          <div className="flex items-end justify-between">
                            <div className="font-mono text-[11px] text-[rgba(255,255,255,0.68)] font-medium">
                              {segment.tier}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className="font-display text-[19px] leading-none font-bold text-[rgba(255,255,255,0.88)]">
                                ${segment.revenue.toLocaleString()}
                              </div>
                              <div className="font-mono text-[10px] text-[rgba(255,255,255,0.52)]">
                                {segment.percentage}%
                              </div>
                            </div>
                          </div>

                          {/* Revenue bar */}
                          <div className="h-[10px] rounded-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 rounded-full"
                              style={{
                                width: `${segment.percentage}%`,
                                backgroundColor: segment.color,
                              }}
                            />
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
                          $94K
                        </div>
                        <div className="font-mono text-[8px] text-[rgba(30,165,80,0.8)] mt-1.5">
                          ▲ +12% YoY
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-[rgba(0,0,0,0.25)] border border-[rgba(255,80,80,0.25)]">
                        <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.4)] mb-2 tracking-wide">
                          Churn Rate
                        </div>
                        <div className="font-display text-[28px] leading-none font-bold text-[rgba(255,120,120,0.95)]">
                          3.2%
                        </div>
                        <div className="font-mono text-[8px] text-[rgba(255,100,100,0.8)] mt-1.5">
                          ▼ -0.8pp QoQ
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
                      $8,450
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
                      4.2M
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
                      1,247
                    </div>
                    <div className="font-mono text-[8px] text-[rgba(255,255,255,0.3)] mt-2">
                      Growing 8% MoM
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && activeAnalyticsLever === 'ab-tests' && (
              <div>
                {/* A/B Tests Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-[3px] text-[rgba(255,255,255,0.34)] uppercase">
                    A/B Tests
                  </div>
                  <div className="rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] px-3 py-1.5 font-mono text-[9px] text-[rgba(14,200,198,0.92)] shadow-[0_0_18px_rgba(14,124,123,0.15)]">
                    {AB_TESTS.length} Active Tests
                  </div>
                </div>

                {/* A/B Tests Table */}
                <GlassCard className="px-5 py-4 border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] table-fixed border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.08)]">
                          <th className="py-3 pr-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Test</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Variant A</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Variant B</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Winner</th>
                          <th className="py-3 px-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Confidence</th>
                          <th className="py-3 pl-4 text-left font-mono text-[9px] tracking-[2px] text-[rgba(255,255,255,0.34)] uppercase font-normal">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AB_TESTS.map((test) => (
                          <tr key={test.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                            {/* Test Name */}
                            <td className="py-3.5 pr-4 font-[Rajdhani] text-[12px] font-semibold text-[rgba(235,245,255,0.9)]">
                              {test.name}
                            </td>

                            {/* Variant A */}
                            <td className="py-3.5 px-4 font-mono text-[10px] text-[rgba(255,255,255,0.65)] leading-relaxed">
                              <div>{test.variantA.label}</div>
                              {test.variantA.lift !== 0 && (
                                <div className={`text-[9px] mt-0.5 ${test.variantA.lift > 0 ? 'text-[rgba(30,165,80,0.8)]' : 'text-[rgba(255,120,120,0.7)]'}`}>
                                  {test.variantA.lift > 0 ? '▲' : '▼'} {Math.abs(test.variantA.lift)}%
                                </div>
                              )}
                            </td>

                            {/* Variant B */}
                            <td className="py-3.5 px-4 font-mono text-[10px] text-[rgba(255,255,255,0.65)] leading-relaxed">
                              <div>{test.variantB.label}</div>
                              {test.variantB.lift !== 0 && (
                                <div className={`text-[9px] mt-0.5 ${test.variantB.lift > 0 ? 'text-[rgba(30,165,80,0.8)]' : 'text-[rgba(255,120,120,0.7)]'}`}>
                                  {test.variantB.lift > 0 ? '▲' : '▼'} {Math.abs(test.variantB.lift)}%
                                </div>
                              )}
                            </td>

                            {/* Winner */}
                            <td className="py-3.5 px-4">
                              {test.winner && test.winner !== 'none' ? (
                                <div className="font-mono text-[11px] text-[rgba(30,165,80,0.85)]">
                                  <span className="font-bold">B</span> <span className="text-[rgba(255,255,255,0.55)]">+{test.winnerLift}%</span>
                                </div>
                              ) : (
                                <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)]">
                                  {test.status === 'too-early' ? 'Too early' : 'In progress'}
                                </div>
                              )}
                            </td>

                            {/* Confidence */}
                            <td className="py-3.5 px-4">
                              <div className="inline-flex items-center justify-center rounded-full border border-[rgba(14,124,123,0.35)] bg-[rgba(14,124,123,0.14)] px-3 py-1 font-mono text-[9px] font-semibold text-[rgba(14,200,198,0.92)]">
                                {test.confidence}%
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 pl-4">
                              <span
                                className={[
                                  'inline-flex items-center justify-center rounded-full border px-3 py-1.5 font-mono text-[8.5px] font-semibold leading-none',
                                  test.status === 'complete'
                                    ? 'border-[rgba(30,165,80,0.4)] bg-[rgba(30,165,80,0.12)] text-[rgba(100,220,120,0.92)]'
                                    : test.status === 'running'
                                    ? 'border-[rgba(14,124,123,0.4)] bg-[rgba(14,124,123,0.14)] text-[rgba(14,200,198,0.92)]'
                                    : 'border-[rgba(255,150,100,0.35)] bg-[rgba(255,150,100,0.12)] text-[rgba(255,180,120,0.88)]',
                                ].join(' ')}
                              >
                                {test.status === 'complete' ? 'Complete' : test.status === 'running' ? 'Running' : 'Too Early'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>

                {/* A/B Tests Summary */}
                <div className="mt-4 px-4 py-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
                  <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-wide">
                    <span className="text-[rgba(14,200,198,0.75)]">✓ 1</span> test completed
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(14,200,198,0.75)]">3</span> currently running
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,180,120,0.75)]">1</span> awaiting more data
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">Avg sample size: 2.4K per variant</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && activeContentLever === 'kb' && (
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    Knowledge Base
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    12 Documents
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {KNOWLEDGE_BASE_DOCS.map((doc) => (
                    <GlassCard
                      key={doc.id}
                      className="flex flex-col px-5 py-4 rounded-2xl border-[rgba(255,255,255,0.1)] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      style={{ background: 'linear-gradient(160deg, #0c1424 0%, #060c18 100%)' }}
                    >
                      {/* Category label */}
                      <div className={[
                        'font-mono text-[9px] tracking-[2px] uppercase mb-2.5 font-medium',
                        kbCategoryToneClass[doc.category],
                      ].join(' ')}>
                        {contentCategoryLabel[doc.category]}
                      </div>

                      {/* Title */}
                      <div className="font-[Rajdhani,sans-serif] text-[19px] leading-[1.18] font-bold text-[rgba(236,245,255,0.96)] mb-2 tracking-[0.1px]">
                        {doc.title}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-1 font-mono text-[10px] text-[rgba(200,220,245,0.5)] mb-4">
                        <span>{doc.words}</span>
                        <span className="mx-1 text-[rgba(255,255,255,0.3)] select-none">·</span>
                        <span>{doc.updated}</span>
                      </div>

                      {/* Actions */}
                      <div className="mt-auto flex items-center gap-2">
                        <button className="rounded-full border border-[rgba(210,228,255,0.32)] bg-[rgba(210,228,255,0.07)] px-4 py-1.5 text-[11px] font-medium text-[rgba(220,235,255,0.82)] hover:bg-[rgba(210,228,255,0.14)] hover:text-white hover:border-[rgba(210,228,255,0.5)] transition-all duration-150">
                          View
                        </button>
                        <button
                          className={[
                            'rounded-full border px-4 py-1.5 text-[11px] font-semibold transition-all duration-150',
                            doc.actionLabel === 'Edit'
                              ? 'border-[rgba(214,174,62,0.55)] bg-[rgba(214,174,62,0.18)] text-[rgba(255,212,96,0.97)] hover:bg-[rgba(214,174,62,0.3)] hover:border-[rgba(214,174,62,0.75)]'
                              : 'border-[rgba(14,200,198,0.5)] bg-[rgba(14,160,156,0.22)] text-[rgba(24,222,220,0.97)] hover:bg-[rgba(14,160,156,0.38)] hover:border-[rgba(14,200,198,0.72)]',
                          ].join(' ')}
                        >
                          {doc.actionLabel}
                        </button>
                      </div>
                    </GlassCard>
                  ))}

                  <button className="min-h-[128px] rounded-2xl border border-dashed border-[rgba(14,188,186,0.4)] bg-[rgba(2,18,28,0.72)] hover:bg-[rgba(3,28,40,0.82)] hover:border-[rgba(14,188,186,0.58)] transition-all duration-200 flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-[26px] leading-none text-[rgba(24,214,220,0.72)] font-light">+</span>
                    <span className="font-mono text-[10px] tracking-[1.4px] text-[rgba(24,214,220,0.68)]">
                      Upload New Document
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'content' && activeContentLever === 'social' && (
              <div>
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    Generated Social Posts
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    Today: 28 Posts
                  </div>
                </div>

                {/* Post cards */}
                <div className="flex flex-col gap-4">
                  {SOCIAL_POSTS.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-[rgba(14,200,198,0.2)] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]"
                      style={{ background: '#080e18' }}
                    >
                      {/* Card header strip */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
                        <div>
                          <div className="font-mono text-[10px] tracking-[1.6px] text-[rgba(18,218,214,0.88)] mb-0.5">
                            {post.channel}
                            <span className="mx-1.5 text-[rgba(255,255,255,0.25)]">·</span>
                            {post.handle}
                          </div>
                          <div className="font-mono text-[9px] text-[rgba(200,220,245,0.42)] tracking-[0.3px]">
                            {post.generatedAgo}
                            {post.bias !== null && (
                              <>
                                <span className="mx-1.5 text-[rgba(255,255,255,0.2)]">·</span>
                                BIAS {post.bias}
                              </>
                            )}
                            {post.bias === null && (
                              <>
                                <span className="mx-1.5 text-[rgba(255,255,255,0.2)]">·</span>
                                No BIAS filter
                              </>
                            )}
                            <span className="mx-1.5 text-[rgba(255,255,255,0.2)]">·</span>
                            {post.model}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="rounded-full border border-[rgba(14,200,198,0.55)] bg-[rgba(14,160,156,0.28)] px-4 py-1.5 text-[11px] font-semibold text-[rgba(24,222,220,0.97)] hover:bg-[rgba(14,160,156,0.44)] hover:border-[rgba(14,200,198,0.78)] transition-all duration-150">
                            {post.primaryAction}
                          </button>
                          <button className="rounded-full border border-[rgba(210,228,255,0.28)] bg-[rgba(210,228,255,0.06)] px-4 py-1.5 text-[11px] font-medium text-[rgba(220,235,255,0.75)] hover:bg-[rgba(210,228,255,0.13)] hover:text-white hover:border-[rgba(210,228,255,0.46)] transition-all duration-150">
                            {post.secondaryAction}
                          </button>
                        </div>
                      </div>

                      {/* Post body */}
                      <div
                        className="px-5 py-4 mx-4 my-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-3"
                        style={{ background: '#03060f' }}
                      >
                        {post.body.map((line, i) => (
                          <p key={i} className="font-mono text-[11px] leading-[1.7] text-[rgba(215,232,255,0.82)]">
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
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    Blog Articles
                  </div>
                  <div className="rounded-full border border-[rgba(14,210,208,0.72)] bg-[rgba(4,62,72,0.72)] px-4 py-1.5 font-mono text-[11px] tracking-[0.6px] text-[rgba(24,228,226,0.97)] shadow-[0_0_14px_rgba(14,180,176,0.45),0_0_28px_rgba(14,180,176,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    8 Published This Month
                  </div>
                </div>

                {/* Table — native <table> so layout never collapses */}
                <div
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  style={{ background: '#080e18' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
                            style={{ width, paddingLeft: label === 'TITLE' ? '20px' : undefined, paddingRight: label === 'ACTIONS' ? '20px' : undefined }}
                            className="py-3 text-left font-mono text-[8.5px] tracking-[1.6px] text-[rgba(255,255,255,0.3)] uppercase font-normal"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BLOG_ARTICLES.map((article, idx) => (
                        <tr
                          key={article.id}
                          style={idx < BLOG_ARTICLES.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Title */}
                          <td className="py-4 pl-5 pr-4 text-[13px] font-medium leading-snug text-[rgba(225,238,255,0.92)]">
                            {article.title}
                          </td>

                          {/* Words */}
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]">
                            {article.words}
                          </td>

                          {/* BIAS */}
                          <td className="py-4">
                            <span
                              className="inline-flex items-center rounded-full font-mono text-[10px] font-semibold"
                              style={{
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
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]">
                            {article.published ?? (
                              <span style={{ color: 'rgba(255,200,100,0.8)' }}>In Progress</span>
                            )}
                          </td>

                          {/* Visits */}
                          <td className="py-4 font-mono text-[11px] text-[rgba(200,220,245,0.55)]">
                            {article.visits ?? <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                          </td>

                          {/* Action */}
                          <td className="py-4 pr-5">
                            <button
                              className="rounded-full font-mono text-[11px] font-medium transition-all duration-150"
                              style={{
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
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    All Contacts
                  </div>
                  {/* Plain white-border pill — matches reference exactly (no teal glow) */}
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.5px] text-[rgba(230,242,255,0.92)]"
                    style={{
                      border: '1px solid rgba(220,235,255,0.38)',
                      background: 'rgba(220,235,255,0.06)',
                      padding: '6px 18px',
                    }}
                  >
                    284 HubSpot Synced
                  </div>
                </div>

                {/* Table */}
                <div
                  className="rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  style={{ background: '#080e18', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['NAME', 'COMPANY', 'STAGE', 'LEAD SCORE', 'LAST ENRICHED', 'RISK'].map((col) => (
                          <th
                            key={col}
                            className="text-left font-mono text-[8.5px] tracking-[2px] text-[rgba(255,255,255,0.28)] uppercase font-normal"
                            style={{
                              padding: '14px 12px',
                              paddingLeft: col === 'NAME' ? '24px' : '12px',
                              paddingRight: col === 'RISK' ? '24px' : '12px',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CONTACTS.map((contact, idx) => (
                        <tr
                          key={contact.id}
                          style={idx < CONTACTS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Name */}
                          <td
                            className="text-[15px] font-bold text-[rgba(235,245,255,0.96)] whitespace-nowrap"
                            style={{ padding: '18px 12px 18px 24px' }}
                          >
                            {contact.name}
                          </td>

                          {/* Company */}
                          <td
                            className="text-[13px] text-[rgba(190,210,240,0.52)] whitespace-nowrap"
                            style={{ padding: '18px 12px' }}
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
                              style={{
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
                            style={{ padding: '18px 12px' }}
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
                              <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div
                    className="text-center font-mono text-[11px] text-[rgba(255,255,255,0.28)]"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}
                  >
                    Showing 7 of 284 contacts · Enriched by{' '}
                    <span style={{ color: 'rgba(24,218,214,0.88)' }}>lead_qualifier</span>
                    {' & '}
                    <span style={{ color: 'rgba(24,218,214,0.88)' }}>churn_predictor</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && activeContactsLever === 'pipeline' && (
              <div>
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    Sales Pipeline
                  </div>
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.5px]"
                    style={{
                      border: '1px solid rgba(214,174,62,0.6)',
                      background: 'rgba(90,62,10,0.55)',
                      color: 'rgba(255,210,90,0.97)',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(200,160,40,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    $142K Pipeline Value
                  </div>
                </div>

                {/* Kanban columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
                  {PIPELINE_COLS.map((col) => (
                    <div
                      key={col.stage}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: '#080e18',
                        border: `1px solid ${col.borderColor}`,
                        boxShadow: col.glow,
                      }}
                    >
                      {/* Column header */}
                      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="font-mono text-[9px] tracking-[2px] uppercase mb-2" style={{ color: col.headerColor }}>
                          {col.stage} · {col.count}
                        </div>
                        <div className="font-bold text-[22px] leading-none" style={{ color: col.valueColor }}>
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
                              color: 'rgba(190,215,245,0.65)',
                              borderBottom: i < col.leads.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                            }}
                          >
                            {lead.company}
                            <span style={{ color: 'rgba(255,255,255,0.28)', margin: '0 5px' }}>·</span>
                            Score {lead.score}
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div
                        className="font-mono text-[9px] text-center"
                        style={{
                          padding: '8px 16px 12px',
                          color: 'rgba(255,255,255,0.25)',
                          borderTop: '1px solid rgba(255,255,255,0.04)',
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
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[9px] tracking-[3.6px] text-[rgba(255,255,255,0.35)] uppercase">
                    Segments
                  </div>
                  <div
                    className="rounded-full font-mono text-[11px] tracking-[0.6px]"
                    style={{
                      border: '1px solid rgba(14,210,208,0.72)',
                      background: 'rgba(4,62,72,0.72)',
                      color: 'rgba(24,228,226,0.97)',
                      padding: '6px 18px',
                      boxShadow: '0 0 14px rgba(14,180,176,0.45), 0 0 28px rgba(14,180,176,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                  >
                    6 Active
                  </div>
                </div>

                {/* Table */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#080e18', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['SEGMENT', 'CONTACTS', 'CRITERIA', 'LAST UPDATED', 'ACTIONS'].map((col) => (
                          <th
                            key={col}
                            className="text-left font-mono text-[8.5px] tracking-[2px] uppercase font-normal"
                            style={{
                              color: 'rgba(255,255,255,0.28)',
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
                      {SEGMENTS.map((seg, idx) => (
                        <tr
                          key={seg.id}
                          style={idx < SEGMENTS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : undefined}
                        >
                          {/* Segment name */}
                          <td style={{ padding: '16px 14px 16px 24px', fontSize: '13px', fontWeight: 600, color: 'rgba(230,242,255,0.94)', whiteSpace: 'nowrap' }}>
                            {seg.name}
                          </td>

                          {/* Contacts count */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: seg.contactsAlert ? 'rgba(240,80,80,0.95)' : 'rgba(200,220,245,0.75)' }}>
                            {seg.contacts}
                          </td>

                          {/* Criteria */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(190,210,240,0.5)' }}>
                            {seg.criteria}
                          </td>

                          {/* Last updated */}
                          <td style={{ padding: '16px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(190,210,240,0.5)' }}>
                            {seg.lastUpdated}
                          </td>

                          {/* Action button */}
                          <td style={{ padding: '16px 24px 16px 14px' }}>
                            <button
                              className="rounded-full font-mono text-[11px] font-semibold transition-all duration-150"
                              style={seg.actionVariant === 'gold'
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
                      <div className="font-mono text-[9px] text-[rgba(255,255,255,0.35)] tracking-[0.5px] mb-4">Stripe · Renews May 12, 2026</div>

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
                          className="px-3 py-[5px] rounded-[20px] font-sans text-[11px] font-bold tracking-[0.5px] transition-all bg-gradient-to-br from-[rgba(201,168,76,0.6)] to-[rgba(80,55,10,0.8)] text-[rgba(255,210,100,1)] border border-[rgba(201,168,76,0.45)] shadow-[0_4px_14px_rgba(0,0,0,0.35),0_0_16px_rgba(201,168,76,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_28px_rgba(201,168,76,0.35)]"
                        >
                          Manage Billing
                        </button>
                        <button
                          type="button"
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
                        {[
                          { name: 'Vercel Edge',    status: 'Operational' },
                          { name: 'Neon Database',  status: 'Operational' },
                          { name: 'Upstash Redis',  status: 'Operational' },
                          { name: 'Anthropic API',  status: 'Operational' },
                          { name: 'Azure Key Vault',status: 'Operational' },
                          { name: 'HubSpot CRM',    status: 'Connected'   },
                        ].map(({ name, status }) => (
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
                          {[
                            { date:'Apr 12, 2026', amount:'$499.00', status:'Paid' },
                            { date:'Mar 12, 2026', amount:'$499.00', status:'Paid' },
                            { date:'Feb 12, 2026', amount:'$399.00', status:'Paid' },
                            { date:'Jan 12, 2026', amount:'$399.00', status:'Paid' },
                          ].map(({ date, amount, status }) => (
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

            {/* ── SETTINGS: TEAM ───────────────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'team' && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Team Members</div>
                  <button
                    type="button"
                    className="px-3 py-[5px] rounded-[20px] font-sans text-[11px] font-bold tracking-[0.5px] transition-all bg-gradient-to-br from-[rgba(14,124,123,0.7)] to-[rgba(0,60,60,0.8)] text-[rgba(14,200,198,1)] border border-[rgba(14,124,123,0.5)] shadow-[0_4px_14px_rgba(0,0,0,0.35),0_0_18px_rgba(14,124,123,0.25)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_28px_rgba(14,124,123,0.45)]"
                  >
                    + Invite Member
                  </button>
                </div>
                <GlassCard className="p-4">
                  {[
                    { initials: 'KM', name: 'Dr. Kenneth Melie PhD',  email: 'kenneth@cloudonesoftware.com', role: 'Owner · CEO/CTO', roleStyle: 'text-[rgba(255,210,100,0.85)] border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.12)]', avatarStyle: { background: 'linear-gradient(135deg,rgba(201,168,76,.5),rgba(80,50,0,.8))', borderColor: 'rgba(201,168,76,0.4)' } },
                    { initials: 'AM', name: 'Alex Martinez',           email: 'alex@cloudonesoftware.com',    role: 'Admin',          roleStyle: 'text-[rgba(14,200,198,0.8)] border-[rgba(14,124,123,0.3)] bg-[rgba(14,124,123,0.12)]', avatarStyle: { background: 'linear-gradient(135deg,rgba(14,124,123,.5),rgba(0,40,50,.8))', borderColor: 'rgba(14,124,123,0.4)' } },
                    { initials: 'JL', name: 'Jamie Lee',               email: 'jamie@cloudonesoftware.com',   role: 'Member',         roleStyle: 'text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]', avatarStyle: { background: 'linear-gradient(135deg,rgba(14,124,123,.4),rgba(0,30,40,.8))', borderColor: 'rgba(14,124,123,0.35)' } },
                    { initials: 'SR', name: 'Sam Rivera',              email: 'sam@cloudonesoftware.com',     role: 'Member',         roleStyle: 'text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]', avatarStyle: { background: 'linear-gradient(135deg,rgba(100,50,180,.4),rgba(30,10,60,.8))', borderColor: 'rgba(100,50,180,0.35)' } },
                  ].map(({ initials, name, email, role, roleStyle, avatarStyle }, idx) => (
                    <div key={email} className={`flex items-center justify-between py-3 ${idx > 0 ? 'border-t border-[rgba(255,255,255,0.05)]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                          style={{ border: '1.5px solid', ...avatarStyle }}
                        >
                          <span style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.9)' }}>{initials}</span>
                        </div>
                        <div>
                          <div className="font-sans text-[13px] font-semibold text-[rgba(255,255,255,0.85)]">{name}</div>
                          <div className="font-mono text-[8.5px] text-[rgba(255,255,255,0.28)] mt-0.5">{email}</div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-[3px] rounded-[12px] border font-mono text-[8.5px] tracking-[0.5px] ${roleStyle}`}>
                        {role}
                      </span>
                    </div>
                  ))}
                </GlassCard>
              </div>
            )}

            {/* ── SETTINGS: INTEGRATIONS ───────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'integrations' && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Integrations</div>
                  <span className="px-2.5 py-[3px] rounded-[20px] bg-[rgba(14,124,123,0.12)] border border-[rgba(14,124,123,0.28)] font-mono text-[8.5px] text-[rgba(14,200,198,0.7)] tracking-[1px]">8 Connected</span>
                </div>
                <GlassCard className="p-4">
                  {[
                    { icon: '🔵', name: 'HubSpot CRM',        desc: 'Contacts · Deals · Webhooks · Technology Partner', statusText: 'Connected · Syncing',  dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '💳', name: 'Stripe',              desc: 'Subscriptions · Billing · Webhooks · TEVV F-02',   statusText: 'Connected',            dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '🔷', name: 'Microsoft 365',       desc: 'Teams · SharePoint · Mail · MSAL · SAML SSO',      statusText: 'Connected',            dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '🟣', name: 'Anthropic Claude API',desc: 'Opus 4 · Sonnet 4 · Haiku — All 39 agents',       statusText: 'Connected · Active',   dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '🔑', name: 'Azure Key Vault',     desc: 'JWT keys · API secrets · RBAC · Managed Identity', statusText: 'Connected',            dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '🐘', name: 'Neon Postgres',       desc: '17 tables · Drizzle ORM · Serverless',             statusText: 'Connected',            dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '⚡', name: 'Upstash Redis',       desc: 'Rate limiting · Sessions · TEVV F-03',             statusText: 'Connected',            dotColor: 'rgba(30,165,80,1)',   textColor: 'rgba(30,165,80,0.85)' },
                    { icon: '🤖', name: 'Reddit API',          desc: 'Community posts — HITL gate always active',        statusText: 'Connected · HITL Only', dotColor: 'rgba(201,168,76,1)', textColor: 'rgba(201,168,76,0.8)' },
                  ].map(({ icon, name, desc, statusText, dotColor, textColor }, idx) => (
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
                      <div className="flex items-center gap-[5px] font-mono text-[9px]" style={{ color: textColor }}>
                        <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                        {statusText}
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </div>
            )}

            {/* ── SETTINGS: SECURITY ───────────────────────────────────────── */}
            {activeTab === 'settings' && activeSettingsLever === 'security' && (
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">Security &amp; Compliance</div>
                  <span className="px-2.5 py-[3px] rounded-[20px] bg-[rgba(14,124,123,0.12)] border border-[rgba(14,124,123,0.28)] font-mono text-[8.5px] text-[rgba(14,200,198,0.7)] tracking-[1px]">NIST TEVV {tevvScore}/100</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* TEVV Controls */}
                  <GlassCard className="p-4">
                    <div className="font-mono text-[9px] tracking-[2px] text-[rgba(14,200,198,0.55)] uppercase mb-3">TEVV Controls</div>
                    <div className="flex flex-col gap-2">
                      {[
                        { code: 'F-01: Docker USER node (non-root)', detail: 'CI gate: whoami === node' },
                        { code: 'F-02: HMAC-SHA256 Webhooks',         detail: '±300s replay window · CWE-208' },
                        { code: 'F-03: RateLimiter never fails open',  detail: 'Returns false on all errors' },
                        { code: 'F-04: WCAG 2.2 AA Accessibility',     detail: 'axe-core CI · 0 violations' },
                      ].map(({ code, detail }, idx) => (
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
                      {[
                        { name: 'JWT · RS256 Algorithm',        detail: 'Azure Key Vault · Entra ID',         badge: 'Active' },
                        { name: 'SAML SSO (Enterprise)',        detail: 'Microsoft Entra ID',                  badge: 'Active' },
                        { name: 'Rate Limiter',                 detail: '60 req/min · Upstash + memory',       badge: 'Active' },
                        { name: 'OWASP ASVS V3.4.1/V3.4.2',   detail: 'Auth middleware compliance',           badge: 'Pass'   },
                        { name: 'Test Suite',                   detail: `${testsPassedLabel} · 0 failures`,    badge: '100%'   },
                      ].map(({ name, detail, badge }) => (
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

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
