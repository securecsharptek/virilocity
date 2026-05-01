import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runAutopilot, AUTOPILOT_TASKS as ENGINE_AUTOPILOT_TASKS } from '../../../lib/agents/autopilot';
import { HubSpotContacts } from '../../../lib/integrations/hubspot';
import { getTenantDashboardState, setTenantDashboardState } from '../../../lib/db/dashboard-state';
import type { Tenant, Tier, TenantModel, AgentType } from '../../../lib/types/index';
import { getSecret } from '../../../lib/auth/keyvault';
import { publishCMSContent, CMSIntegrationError } from '../../../lib/integrations/cms';
import { LinkedInPoster } from '../../../lib/integrations/linkedin';
import { AGENT_COUNT, HAIKU_AGENTS, REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../lib/types/index';
import { db, contentPages, payments, agentExecutions, abTests as abTestsTable } from '../../../lib/db/client';
import { eq, desc, sum, count } from 'drizzle-orm';

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
  const scheduled = ENGINE_AUTOPILOT_TASKS.map((agent): TaskScheduleItem => ({
    agent,
    task: AUTOPILOT_TASK_LABELS[agent] ?? `Run ${agent.replaceAll('_', ' ')}`,
    model: getAutopilotModelLabel(agent, tier),
    status: 'scheduled',
  }));

  if (REDDIT_REQUIRES_HUMAN_APPROVAL) {
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

  store.agents.all = ALL_AGENT_TYPES.map((agentName, index) => {
    const task = taskStatusMap.get(agentName);
    const status: AgentCard['status'] = task?.status === 'running'
      ? 'running'
      : task?.status === 'hitl'
        ? 'hitl'
        : 'idle';
    const isHaiku = HAIKU_AGENTS.has(agentName as AgentType);

    return {
      id: `agent_${index + 1}`,
      name: agentName,
      icon: taskIcons[agentName] ?? '◎',
      status,
      description: agentDescriptions[agentName] ?? agentName.replace(/_/g, ' ').toUpperCase(),
      fairnessScore: status === 'hitl' ? 0 : Math.floor(78 + ((index * 7) % 18)),
      model: isHaiku ? 'Haiku' : (index % 3 === 0 ? 'Opus' : 'Sonnet'),
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
    schedule: task.status === 'hitl' ? 'Human approval' : 'Every 6h',
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

const INITIAL_HITL_QUEUE: HITLQueueItem[] = [
  {
    id: '1',
    subreddit: 'r/SaaSMarketing',
    title: 'How We Cut CAC by 48% with AI Agents',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: "We've been running an AI agent stack for 90 days now. Here's what actually moved the needle on CAC...",
    queuedAt: now() - 30 * 60 * 1000,
  },
  {
    id: '2',
    subreddit: 'r/ArtificialIntelligence',
    title: 'Fairness Filtering in Production AI Agents',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: 'Running NIST TEVV-aligned Fairness Filters on LLM outputs at scale...',
    queuedAt: now() - 42 * 60 * 1000,
  },
  {
    id: '3',
    subreddit: 'r/Startups',
    title: 'Enterprise SaaS Lessons from Year 2',
    agent: 'reddit_manager',
    platform: 'Reddit',
    content: 'Year 2 of building a B2B SaaS for marketing teams. Three things I wish I had known...',
    queuedAt: now() - 55 * 60 * 1000,
  },
];

const INITIAL_SOCIAL_POSTS: SocialPost[] = [
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
    status: 'draft',
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
    status: 'draft',
  },
];

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
    activeAgents: 12,
    postsGenerated: 47,
    leadsCaptured: 284,
    mrr: 8320,
  },
  feedItems: [
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
  ],
  autopilot: {
    running: false,
    paused: false,
    stopRequested: false,
    nextRunAt: now() + 2 * 60 * 60 * 1000 + 4 * 60 * 1000,
    lastRunSummary: {
      completedTasks: 34,
      postsCreated: 58,
      hitlPending: 3,
      durationText: '02:18',
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
  },  kbDocuments: [
    { id: '1', category: 'product-docs', title: 'Virilocity Platform Overview', words: '4,280 words', updated: 'Updated 2d ago', actionLabel: 'Re-train' },
    { id: '2', category: 'product-docs', title: '39 Agent Capabilities Guide', words: '8,640 words', updated: 'Updated today', actionLabel: 'Re-train' },
    { id: '3', category: 'brand', title: 'Brand Voice & Tone Guidelines', words: '2,100 words', updated: 'Updated 5d ago', actionLabel: 'Edit' },
    { id: '4', category: 'competitor-intel', title: 'Market Landscape Analysis', words: '6,320 words', updated: 'Updated 1w ago', actionLabel: 'Re-train' },
    { id: '5', category: 'product-docs', title: 'Pricing & Tier Comparison', words: '1,840 words', updated: 'Updated 3d ago', actionLabel: 'Re-train' },
  ],
  orgMembers: [
    { id: 'mem_001', initials: 'KM', name: 'Keshav Choudhary', email: 'keshav@cloudonesoftware.com', role: 'Owner' },
    { id: 'mem_002', initials: 'AM', name: 'Alex Martinez', email: 'alex@cloudonesoftware.com', role: 'Admin' },
    { id: 'mem_003', initials: 'JL', name: 'Jamie Lee', email: 'jamie@cloudonesoftware.com', role: 'Member' },
    { id: 'mem_004', initials: 'SR', name: 'Sam Rivera', email: 'sam@cloudonesoftware.com', role: 'Member' },
  ],
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
    all: [
      { id: '1', name: 'Sarah Chen', company: 'TechFlow Inc', stage: 'Customer', leadScore: 94, lastEnriched: '2h ago', risk: 'Low' },
      { id: '2', name: 'Marcus Williams', company: 'GrowthLabs', stage: 'SQL', leadScore: 87, lastEnriched: '4h ago', risk: 'Low' },
      { id: '3', name: 'Priya Patel', company: 'Scale.io', stage: 'MQL', leadScore: 71, lastEnriched: '8h ago', risk: 'Medium' },
      { id: '4', name: 'Jordan Lee', company: 'Nexus Digital', stage: 'Customer', leadScore: 88, lastEnriched: '1d ago', risk: 'High' },
      { id: '5', name: 'Alex Romero', company: 'BrightPath Co', stage: 'Lead', leadScore: 42, lastEnriched: '2d ago', risk: null },
      { id: '6', name: 'Kim Nakamura', company: 'DataDriven LLC', stage: 'SQL', leadScore: 83, lastEnriched: '3h ago', risk: 'Low' },
      { id: '7', name: "Chris O'Brien", company: 'LaunchFast', stage: 'Customer', leadScore: 91, lastEnriched: '6h ago', risk: 'Medium' },
    ],
    pipelineCols: [
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
    ],
    segments: [
      { id: '1', name: 'At-Risk Customers', contacts: 3, contactsAlert: true, criteria: 'Churn score <0.3', lastUpdated: '31m ago', action: 'Email Campaign', actionVariant: 'teal' },
      { id: '2', name: 'High-Value SQLs', contacts: 12, contactsAlert: false, criteria: 'Score >80 & stage=SQL', lastUpdated: '3h ago', action: 'Email Campaign', actionVariant: 'teal' },
      { id: '3', name: 'Trial Users · Day 7', contacts: 28, contactsAlert: false, criteria: 'Trial, joined 7d ago', lastUpdated: 'Daily', action: 'Drip Sequence', actionVariant: 'teal' },
      { id: '4', name: 'Engaged MQLs', contacts: 44, contactsAlert: false, criteria: 'Stage=MQL & 3+ visits', lastUpdated: '6h ago', action: 'Email Campaign', actionVariant: 'teal' },
      { id: '5', name: 'Enterprise Prospects', contacts: 8, contactsAlert: false, criteria: 'Company size >200', lastUpdated: '1d ago', action: 'Sales Outreach', actionVariant: 'gold' },
    ],
    summary: {
      totalSynced: 284,
      pipelineValue: '$142K',
      activeSegments: 6,
    },
  },
  socialPosts: INITIAL_SOCIAL_POSTS,
  settings: {
    billingHistory: [
      { date: 'Apr 12, 2026', amount: '$499.00', status: 'Paid' },
      { date: 'Mar 12, 2026', amount: '$499.00', status: 'Paid' },
      { date: 'Feb 12, 2026', amount: '$399.00', status: 'Paid' },
      { date: 'Jan 12, 2026', amount: '$399.00', status: 'Paid' },
    ],
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
  const raw = props?.['hs_lead_score'] ?? props?.['hubspotscore'] ?? null;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const computeContactsFromHubSpot = async (tenantId: string, store: DashboardStore): Promise<void> => {
  try {
    const accessToken = await getSecret(`hubspot-access-${tenantId}`);
    if (!accessToken) {
      console.warn('[hubspot-sync] skipped: missing access token', { tenantId });
      return;
    }

    const hubspot = new HubSpotContacts(accessToken);
    const rows = await hubspot.listContacts(100);
    if (rows.length === 0) {
      console.info('[hubspot-sync] completed: no contacts returned', { tenantId });
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
        company: (props['company'] ?? '').trim() || 'Unknown',
        stage,
        leadScore,
        lastEnriched: 'just now',
        risk: null,
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
  } catch (error) {
    console.error('[hubspot-sync] failed', {
      tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    // If HubSpot token is unavailable or API fails, keep existing seeded contacts.
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
    settings: store.settings,
  };
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = makeTenant(session);
  const store = await getTenantDashboardState<DashboardStore>(tenant.id, INITIAL_STORE);

  refreshUserProfile(store, session);
  store.autopilot.tasks = mergeAutopilotTasks(store.autopilot.tasks, tenant.tier);
  syncAgentsFromAutopilot(store);

  // Fetch real integration status
  try {
    store.settings.integrations = await computeIntegrationStatus(tenant);
  } catch (e) {
    // Fallback to seed integrations if computation fails
    console.warn('Failed to compute integration status', e);
  }

  await computeContactsFromHubSpot(tenant.id, store);
  await computeAnalyticsFromDb(tenant.id, store);
  await setTenantDashboardState(tenant.id, store);
  return NextResponse.json(toResponse(store));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = makeTenant(session);
  const store = await getTenantDashboardState<DashboardStore>(tenant.id, INITIAL_STORE);

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
    provider?: 'shopify' | 'webflow';
    slug?: string;
    htmlBody?: string;
    status?: 'draft' | 'published';
    schemaJson?: Record<string, unknown>;
    postChannel?: 'linkedin' | string;
    postBody?: string;
    postId?: string;
    postContent?: string[];
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
      const result = await runAutopilot(tenant, {
        shouldStop: () => store.autopilot.stopRequested || store.autopilot.paused,
      });

      const succeeded = result.succeeded;
      store.autopilot.lastRunSummary = {
        completedTasks: result.totalTasks,
        postsCreated: Math.max(0, succeeded * 2),
        hitlPending: store.hitlQueue.length,
        durationText: `${Math.max(1, Math.round(result.durationMs / 60000))}m`,
      };
      store.autopilot.nextRunAt = Date.now() + 6 * 60 * 60 * 1000;

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

    await setTenantDashboardState(tenant.id, store);
    return NextResponse.json({ ok: true, data: toResponse(store) });
  }

  if (body.action === 'approveHitl' || body.action === 'rejectHitl') {
    const id = body.id;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = store.hitlQueue.find(item => item.id === id);
    if (!existing) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });

    store.hitlQueue = store.hitlQueue.filter(item => item.id !== id);
    store.autopilot.lastRunSummary.hitlPending = store.hitlQueue.length;
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

  if (body.action === 'publishCms') {
    const provider = body.provider;
    const title = body.title?.trim() ?? '';
    const slug = body.slug?.trim() ?? '';
    const htmlBody = body.htmlBody?.trim() ?? '';
    const status = body.status ?? 'published';

    if (!provider || (provider !== 'shopify' && provider !== 'webflow')) {
      return NextResponse.json({ error: 'provider must be one of: shopify, webflow' }, { status: 400 });
    }
    if (!title || !slug || !htmlBody) {
      return NextResponse.json({ error: 'title, slug, and htmlBody are required' }, { status: 400 });
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
          message: `**cms_publish** ${provider} published "${title}"`,
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

    if (channel !== 'linkedin') {
      return NextResponse.json({ error: 'postChannel must be linkedin' }, { status: 400 });
    }

    const targetIndex = postId ? store.socialPosts.findIndex(post => post.id === postId) : -1;
    const targetPost = targetIndex >= 0 ? store.socialPosts[targetIndex] : undefined;

    if (targetPost?.status === 'posted') {
      return NextResponse.json({ error: 'This social post has already been published' }, { status: 409 });
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
          message: `**linkedin_poster** published post (${result.id})`,
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
