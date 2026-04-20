// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Agent Status Grid
// Shows all 39 agents with status, last-run, model, and HITL flag
// ─────────────────────────────────────────────────────────────────────────────
import Badge from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';
import { AGENT_COUNT, HAIKU_AGENTS, TIER_LIMITS } from '../../lib/types/index';
import type { Tier, AgentType } from '../../lib/types/index';

type AgentStatus = 'active' | 'idle' | 'queued' | 'hitl' | 'disabled';

interface AgentRow {
  type:     AgentType;
  label:    string;
  status:   AgentStatus;
  model:    'haiku' | 'sonnet' | 'opus';
  lastRun?: string;
  hitl?:    boolean;
}

const STATUS_VARIANT: Record<AgentStatus, BadgeVariant> = {
  active:   'success',
  idle:     'neutral',
  queued:   'warning',
  hitl:     'info',
  disabled: 'danger',
};

const SAMPLE_AGENTS: AgentRow[] = [
  { type:'keyword_researcher',       label:'Keyword Researcher',        status:'active',  model:'sonnet', lastRun:'5m ago' },
  { type:'trend_detector',           label:'Trend Detector',            status:'active',  model:'haiku',  lastRun:'5m ago' },
  { type:'hs_contact_enricher',      label:'HubSpot Enricher',          status:'active',  model:'sonnet', lastRun:'5m ago' },
  { type:'bid_optimizer',            label:'Bid Optimizer',             status:'queued',  model:'sonnet' },
  { type:'backlink_outreach',        label:'Backlink Outreach',         status:'idle',    model:'sonnet', lastRun:'1h ago' },
  { type:'social_listener',          label:'Social Listener',           status:'active',  model:'haiku',  lastRun:'2m ago' },
  { type:'ai_visibility_tracker',    label:'AI Visibility Tracker',     status:'active',  model:'haiku',  lastRun:'2m ago' },
  { type:'churn_predictor',          label:'Churn Predictor',           status:'queued',  model:'sonnet' },
  { type:'ab_test_orchestrator',     label:'A/B Test Orchestrator',     status:'idle',    model:'sonnet', lastRun:'30m ago' },
  { type:'workspace_reporter',       label:'Workspace Reporter',        status:'active',  model:'haiku',  lastRun:'5m ago' },
  { type:'cross_channel_orchestrator',label:'Cross-Channel Orchestrator',status:'active', model:'sonnet', lastRun:'5m ago' },
  { type:'geo_content_generator',    label:'GEO Content Generator',     status:'idle',    model:'sonnet', lastRun:'20m ago' },
  { type:'cvr_optimizer',            label:'CVR Optimizer',             status:'idle',    model:'sonnet', lastRun:'45m ago' },
  { type:'lead_scorer',              label:'Lead Scorer',               status:'queued',  model:'sonnet' },
  { type:'revenue_forecaster',       label:'Revenue Forecaster',        status:'idle',    model:'sonnet', lastRun:'1h ago' },
  { type:'viral_analyzer',           label:'Viral Analyzer',            status:'idle',    model:'sonnet' },
  { type:'reddit_manager',           label:'Reddit Manager',            status:'hitl',    model:'sonnet', hitl:true },
  { type:'knowledge_base_curator',   label:'KB Curator',                status:'idle',    model:'haiku',  lastRun:'2h ago' },
  { type:'email_sequencer',          label:'Email Sequencer',           status:'idle',    model:'sonnet' },
  { type:'ad_creative_generator',    label:'Ad Creative Generator',     status:'idle',    model:'sonnet' },
  { type:'seo_auditor',              label:'SEO Auditor',               status:'idle',    model:'sonnet', lastRun:'3h ago' },
  { type:'competitor_tracker',       label:'Competitor Tracker',        status:'idle',    model:'sonnet' },
  { type:'content_repurposer',       label:'Content Repurposer',        status:'idle',    model:'sonnet' },
  { type:'influencer_matcher',       label:'Influencer Matcher',        status:'idle',    model:'sonnet' },
  { type:'pr_monitor',               label:'PR Monitor',                status:'idle',    model:'sonnet' },
  { type:'brand_voice_enforcer',     label:'Brand Voice Enforcer',      status:'idle',    model:'sonnet' },
  { type:'customer_journey_mapper',  label:'Customer Journey Mapper',   status:'idle',    model:'sonnet' },
  { type:'attribution_analyzer',     label:'Attribution Analyzer',      status:'idle',    model:'sonnet' },
  { type:'budget_allocator',         label:'Budget Allocator',          status:'idle',    model:'sonnet' },
  { type:'landing_page_optimizer',   label:'Landing Page Optimizer',    status:'idle',    model:'sonnet' },
  { type:'webinar_orchestrator',     label:'Webinar Orchestrator',      status:'idle',    model:'sonnet' },
  { type:'community_manager',        label:'Community Manager',         status:'idle',    model:'sonnet' },
  { type:'referral_program_manager', label:'Referral Program Manager',  status:'idle',    model:'sonnet' },
  { type:'upsell_engine',            label:'Upsell Engine',             status:'idle',    model:'sonnet' },
  { type:'renewal_manager',          label:'Renewal Manager',           status:'idle',    model:'sonnet' },
  { type:'feedback_analyzer',        label:'Feedback Analyzer',         status:'idle',    model:'sonnet' },
  { type:'competitive_intel',        label:'Competitive Intel',         status:'idle',    model:'sonnet' },
  { type:'market_researcher',        label:'Market Researcher',         status:'idle',    model:'sonnet' },
  { type:'campaign_orchestrator',    label:'Campaign Orchestrator',     status:'idle',    model:'sonnet' },
];

interface AgentGridProps {
  tier?:   Tier;
  filter?: AgentStatus | 'all';
}

export default function AgentGrid({ tier = 'pro', filter = 'all' }: AgentGridProps) {
  const limit   = TIER_LIMITS[tier].agentsEnabled;
  const agents  = filter === 'all'
    ? SAMPLE_AGENTS
    : SAMPLE_AGENTS.filter(a => a.status === filter);

  const activeCount  = SAMPLE_AGENTS.filter(a => a.status === 'active').length;
  const queuedCount  = SAMPLE_AGENTS.filter(a => a.status === 'queued').length;

  return (
    <section aria-labelledby="agent-grid-heading">
      {/* Summary row */}
      <div className="flex items-center justify-between mb-4">
        <h2 id="agent-grid-heading" className="text-base font-bold text-navy">
          All {AGENT_COUNT} Agents
        </h2>
        <div className="flex gap-2 text-xs">
          <Badge variant="success" dot>{activeCount} active</Badge>
          <Badge variant="warning" dot>{queuedCount} queued</Badge>
          <Badge variant="neutral">{limit === -1 ? AGENT_COUNT : limit} enabled on {tier}</Badge>
        </div>
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
        role="list"
        aria-label="Agent status list"
      >
        {agents.map((agent, idx) => {
          const isDisabled = limit !== -1 && idx >= limit;
          const displayStatus: AgentStatus = isDisabled ? 'disabled' : agent.status;

          return (
            <div
              key={agent.type}
              role="listitem"
              aria-label={`${agent.label}: ${displayStatus}${agent.hitl ? ', requires human approval' : ''}`}
              className={[
                'flex items-center justify-between px-3 py-2.5 rounded-lg border',
                isDisabled ? 'opacity-40 bg-lgray border-mgray' : 'bg-white border-mgray',
              ].join(' ')}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-navy truncate">{agent.label}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-400 uppercase">{agent.model}</span>
                  {agent.lastRun && (
                    <span className="text-xs text-slate-300">· {agent.lastRun}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {agent.hitl && (
                  <span aria-label="Human approval required" title="HITL" className="text-xs text-teal font-bold">HITL</span>
                )}
                <Badge variant={STATUS_VARIANT[displayStatus]}>
                  {displayStatus}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
