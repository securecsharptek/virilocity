import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runAutopilot } from '../../../lib/agents/autopilot';
import type { Tenant, Tier, TenantModel } from '../../../lib/types/index';
import { AGENT_COUNT, REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../lib/types/index';

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
  status: 'scheduled' | 'hitl';
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
  status: 'scheduled' | 'hitl';
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
};

const now = () => Date.now();

const DEFAULT_AUTOPILOT_TASKS: TaskScheduleItem[] = [
  { agent: 'content_strategist', task: 'Plan 7-day content', model: 'Sonnet', status: 'scheduled' },
  { agent: 'blog_writer', task: 'Generate 2 articles', model: 'Sonnet', status: 'scheduled' },
  { agent: 'seo_optimizer', task: 'Refresh 10 meta tags', model: 'Haiku', status: 'scheduled' },
  { agent: 'linkedin_poster', task: 'Post 3 updates', model: 'Haiku', status: 'scheduled' },
  { agent: 'reddit_manager', task: 'Draft community post', model: 'Haiku', status: 'hitl' },
  { agent: 'email_campaigner', task: 'Drip to new leads', model: 'Sonnet', status: 'scheduled' },
  { agent: 'churn_predictor', task: 'Score all accounts', model: 'Opus', status: 'scheduled' },
  { agent: 'lead_qualifier', task: 'Score new HS contacts', model: 'Haiku', status: 'scheduled' },
];

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
    tasks: DEFAULT_AUTOPILOT_TASKS,
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
  },
};

let store: DashboardStore = { ...INITIAL_STORE };

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

const toResponse = () => {
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
  };
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(toResponse());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as { action?: string; id?: string };

  if (body.action === 'runAutopilot') {
    if (store.autopilot.paused) {
      return NextResponse.json({ error: 'Autopilot is paused. Resume before running.' }, { status: 409 });
    }

    if (store.autopilot.running) {
      return NextResponse.json({ error: 'Autopilot already running' }, { status: 409 });
    }

    store.autopilot.running = true;
    store.autopilot.stopRequested = false;

    try {
      const tenant = makeTenant(session);
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
      store.feedItems = [
        {
          id: `run_${Date.now()}`,
          message: `**autopilot** completed ${result.succeeded}/${result.totalTasks} tasks`,
          time: 'just now · orchestration complete',
          type: 'teal' as const,
        },
        ...store.feedItems,
      ].slice(0, 8);

      return NextResponse.json({ ok: true, result, data: toResponse() });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: detail }, { status: 500 });
    } finally {
      store.autopilot.running = false;
    }
  }

  if (body.action === 'pauseAutopilot') {
    store.autopilot.paused = true;
    if (store.autopilot.running) store.autopilot.stopRequested = true;

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

    return NextResponse.json({ ok: true, data: toResponse() });
  }

  if (body.action === 'resumeAutopilot') {
    store.autopilot.paused = false;
    store.autopilot.stopRequested = false;

    store.feedItems = [
      {
        id: `resume_${Date.now()}`,
        message: '**autopilot** resumed',
        time: 'just now · orchestration control',
        type: 'green' as const,
      },
      ...store.feedItems,
    ].slice(0, 8);

    return NextResponse.json({ ok: true, data: toResponse() });
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

    return NextResponse.json({ ok: true, data: toResponse() });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
