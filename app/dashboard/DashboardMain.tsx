// ─────────────────────────────────────────────────────────────────────────────
// DashboardClient — V16.4 Glassmorphic Dashboard UI
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';
import DashboardHeader from '../../components/layout/DashboardHeader';
import TabButton from '../../components/ui/TabButton';
import Lever from '../../components/ui/Lever';
import KPICard from '../../components/ui/KPICard';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import ActivityFeed, { type FeedItem } from '../../components/ui/ActivityFeed';

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

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('dash');
  const [activeDashLever, setActiveDashLever] = useState('overview');
  const [activeAgentsLever, setActiveAgentsLever] = useState('all');
  const [activeAnalyticsLever, setActiveAnalyticsLever] = useState('traffic');
  const [activeContentLever, setActiveContentLever] = useState('kb');
  const [activeContactsLever, setActiveContactsLever] = useState('all');
  const [activeSettingsLever, setActiveSettingsLever] = useState('billing');

  return (
    <div className="min-h-screen">
      {/* Container with max-width */}
      <div className="relative z-10 max-w-[1100px] mx-auto px-4 pb-10">
        {/* Header */}
        <DashboardHeader
          user={{ name: 'Keshav Choudhary', initials: 'KM' }}
          tenant="CloudOneSoftware LLC · Enterprise"
          status={{ text: 'LIVE', count: '503/503 PASS' }}
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

          {/* Content Area */}
          <div className="min-h-[560px] px-5 py-[22px] bg-gradient-to-b from-[rgba(0,8,20,0.58)] to-[rgba(0,4,12,0.4)]">
            {activeTab === 'dash' && activeDashLever === 'overview' && (
              <div>
                {/* KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-[18px]">
                  <KPICard
                    title="Active Agents"
                    icon="◎"
                    value="12"
                    variant="teal"
                    change="▲ +3 from yesterday"
                    subtitle="of 39 total agents"
                  />
                  <KPICard
                    title="Posts Generated"
                    icon="◻"
                    value="47"
                    variant="teal"
                    change="▲ +12 vs avg"
                    subtitle="today · across all channels"
                  />
                  <KPICard
                    title="Leads Captured"
                    icon="◉"
                    value="284"
                    variant="green"
                    valueColor="green"
                    change="▲ +31 this week"
                    subtitle="HubSpot synced"
                  />
                  <KPICard
                    title="MRR"
                    icon="$"
                    value="$8,320"
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
                          95.4
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
                      <ActivityFeed items={FEED_ITEMS} />
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
                          02:04:03
                        </div>
                        <div className="font-mono text-[11px] text-[rgba(255,255,255,0.45)] mb-6 leading-relaxed">
                          Every 6-8 hrs · CRON: 0 */6 * * * · NEXT: 02:30 PM UTC
                        </div>
                        <div className="flex justify-center gap-3">
                          <button className="px-6 py-2.5 rounded-full bg-gradient-to-br from-[rgba(14,124,123,0.7)] to-[rgba(0,60,60,0.8)] border border-[rgba(14,200,198,0.4)] text-[rgba(14,200,198,1)] font-bold text-[13px] tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_24px_rgba(14,124,123,0.3)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.45),0_0_35px_rgba(14,124,123,0.5)] transition-all flex items-center gap-2.5">
                            <span className="text-[15px]">▶</span> Run Now
                          </button>
                          <button className="px-6 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.5)] font-bold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.8)] hover:border-[rgba(255,255,255,0.25)] transition-all flex items-center gap-2.5">
                            <span className="text-[15px]">⏸</span> Pause
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
                            34
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            ✓ Completed in 02:18 · All agents · No issues
                          </div>
                        </div>
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(14,124,123,0.12)] to-[rgba(0,38,38,0.08)] border border-[rgba(14,124,123,0.28)]">
                          <div className="font-display text-5xl font-bold text-[rgba(14,200,198,0.95)] mb-2 [text-shadow:0_0_24px_rgba(14,200,198,0.5)]">
                            58
                          </div>
                          <div className="font-mono text-[10px] text-[rgba(255,255,255,0.45)] leading-relaxed">
                            Posts created · Blog 34 · LinkedIn 24
                          </div>
                        </div>
                        <div className="text-center p-5 rounded-xl bg-gradient-to-br from-[rgba(201,168,76,0.12)] to-[rgba(55,35,0,0.08)] border border-[rgba(201,168,76,0.32)]">
                          <div className="font-display text-5xl font-bold text-[rgba(255,210,100,0.95)] mb-2 [text-shadow:0_0_24px_rgba(201,168,76,0.5)]">
                            3
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
                          {AUTOPILOT_TASKS.map((item) => (
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
                    3 Pending Approval
                  </div>
                </div>

                {/* Queue Items */}
                <div className="space-y-4">
                  {HITL_QUEUE_ITEMS.map((item) => (
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
                            Queued 30 min ago
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
                        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-[rgba(14,124,123,0.65)] to-[rgba(0,60,60,0.75)] border-2 border-[rgba(14,200,198,0.4)] text-[rgba(14,200,198,1)] font-bold text-[13px] tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.4),0_0_22px_rgba(14,124,123,0.28)] hover:shadow-[0_5px_20px_rgba(0,0,0,0.45),0_0_32px_rgba(14,124,123,0.42)] transition-all">
                          <span className="text-[15px]">✓</span>
                          Approve & Post
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.045)] border-2 border-[rgba(255,255,255,0.14)] text-[rgba(255,255,255,0.52)] font-semibold text-[13px] tracking-wide hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.78)] hover:border-[rgba(255,255,255,0.22)] transition-all">
                          <span className="text-[15px]">←</span>
                          Edit Draft
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-[rgba(180,30,30,0.38)] to-[rgba(100,10,10,0.5)] border-2 border-[rgba(255,80,80,0.35)] text-[rgba(255,120,120,0.98)] font-bold text-[13px] tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.4),0_0_20px_rgba(180,30,30,0.22)] hover:shadow-[0_5px_20px_rgba(0,0,0,0.45),0_0_30px_rgba(180,30,30,0.38)] transition-all">
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
                    <span className="text-[rgba(255,210,100,0.85)]">p.3</span> HITL pending
                    <span className="mx-2 text-[rgba(255,255,255,0.15)]">|</span>
                    <span className="text-[rgba(255,255,255,0.25)]">(Timeline: Lifetime 100 / Y1: Current Cycle FY26 → deploy Q2:q-FY27 → TTM ago → Strategic Refresh)</span>
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS TAB CONTENT - Updated */}
            {activeTab === 'agents' && (
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
                  {AGENT_CARDS.map((agent) => (
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

            {activeTab === 'analytics' && (
              <div className="text-center py-20">
                <div className="font-display text-2xl text-[rgba(14,200,198,0.9)] mb-2">
                  Analytics View
                </div>
                <div className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
                  Analytics dashboard coming soon
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="text-center py-20">
                <div className="font-display text-2xl text-[rgba(14,200,198,0.9)] mb-2">
                  Content View
                </div>
                <div className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
                  Content management coming soon
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="text-center py-20">
                <div className="font-display text-2xl text-[rgba(14,200,198,0.9)] mb-2">
                  Contacts View
                </div>
                <div className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
                  Contact management coming soon
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="text-center py-20">
                <div className="font-display text-2xl text-[rgba(255,210,100,0.9)] mb-2">
                  Settings View
                </div>
                <div className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
                  Settings panel coming soon
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="px-5 py-2 bg-[rgba(0,0,0,0.42)] border-t border-[rgba(255,255,255,0.05)] flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.3)]">
                <span className="text-[rgba(14,200,198,0.75)]">12</span> Active
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[8.5px] text-[rgba(255,255,255,0.3)]">
                <span className="text-[rgba(14,200,198,0.75)]">503</span> Tests Passing
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
    </div>
  );
}
