// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Dashboard Page (Server Component)
// B2B: shows org members, team KPIs, seat usage
// B2C: shows individual agent activity and billing
// WCAG 2.2 compliant
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import { TIER_LIMITS, PRICES, AGENT_COUNT, VERSION } from '../../lib/types/index';
import NavBar from '../../components/layout/NavBar';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Virilocity AI marketing command centre.',
};

// KPI card component
function KPICard({ label, value, unit = '', color = 'navy', description }: {
  label: string; value: string | number; unit?: string;
  color?: 'navy' | 'teal' | 'green' | 'gold'; description?: string;
}) {
  const colorMap = { navy:'text-navy', teal:'text-teal', green:'text-green-700', gold:'text-yellow-700' };
  return (
    <article className="bg-white rounded-xl border border-mgray p-5" aria-labelledby={`kpi-${label.replace(/\s/g,'-').toLowerCase()}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p id={`kpi-${label.replace(/\s/g,'-').toLowerCase()}`}
        className={`text-3xl font-bold ${colorMap[color]}`}
        aria-label={`${label}: ${value}${unit}`}>
        {value}<span className="text-lg ml-1 font-normal text-slate-400">{unit}</span>
      </p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </article>
  );
}

// Agent status pill
function AgentPill({ name, status }: { name: string; status: 'active' | 'idle' | 'queued' }) {
  const colors = { active:'bg-green-100 text-green-800', idle:'bg-lgray text-slate-500', queued:'bg-yellow-100 text-yellow-800' };
  return (
    <li className={`px-3 py-1.5 rounded-full text-xs font-medium ${colors[status]} flex items-center gap-1.5`}
      role="listitem" aria-label={`${name}: ${status}`}>
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${status==='active'?'bg-green-500':status==='queued'?'bg-yellow-500':'bg-slate-300'}`} />
      {name}
    </li>
  );
}

const SAMPLE_AGENTS: Array<{ name: string; status: 'active' | 'idle' | 'queued' }> = [
  { name:'Keyword Researcher', status:'active' },
  { name:'GEO Content Generator', status:'active' },
  { name:'Social Listener', status:'active' },
  { name:'AI Visibility Tracker', status:'active' },
  { name:'Churn Predictor', status:'queued' },
  { name:'HubSpot Enricher', status:'idle' },
  { name:'Reddit Manager', status:'idle' },
  { name:'CVR Optimizer', status:'queued' },
  { name:'Revenue Forecaster', status:'idle' },
];

export default function DashboardPage() {
  // Production: fetch real tenant data via Drizzle + auth session
  const tier      = 'pro';
  const model     = 'b2b';
  const limits    = TIER_LIMITS[tier];
  const price     = PRICES[tier];

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-lgray">
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Page header */}
          <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy">Command Centre</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Virilocity V{VERSION} · {tier.charAt(0).toUpperCase()+tier.slice(1)} {model.toUpperCase()} ·{' '}
                {limits.agentsEnabled === -1 ? 'All 39' : limits.agentsEnabled} agents active
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary text-sm px-4"
                aria-label="Run autopilot cycle — dispatches all 11 daily tasks">
                <span aria-hidden="true">▶</span> Run Autopilot
              </button>
              <a href="/api/billing/plans" className="btn border border-mgray text-navy text-sm px-4 hover:bg-white">
                Upgrade
              </a>
            </div>
          </header>

          {/* KPI grid */}
          <section aria-labelledby="kpi-heading" className="mb-8">
            <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="ROAS"                value="3.8"  unit="x"  color="teal"  description="Return on ad spend" />
              <KPICard label="AI Visibility Score" value="74"   unit="%"  color="navy"  description="Share of AI search answers" />
              <KPICard label="MQLs This Week"      value="12"   unit=""   color="green" description="Marketing qualified leads" />
              <KPICard label="Content Pieces"      value="7"    unit=""   color="gold"  description="Published this week" />
            </dl>
          </section>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Agent status */}
            <section aria-labelledby="agents-heading" className="lg:col-span-2 bg-white rounded-xl border border-mgray p-6">
              <h2 id="agents-heading" className="font-bold text-navy mb-4 flex items-center justify-between">
                Active Agents
                <span className="text-xs font-normal text-slate-400">{AGENT_COUNT} total</span>
              </h2>
              <ul className="flex flex-wrap gap-2" aria-label="Agent status list">
                {SAMPLE_AGENTS.map(a => <AgentPill key={a.name} {...a} />)}
              </ul>
              <p className="text-xs text-slate-400 mt-4">Last autopilot run: Today at 06:00 UTC · Next: Tomorrow 06:00 UTC</p>
            </section>

            {/* Plan summary */}
            <section aria-labelledby="plan-heading" className="bg-white rounded-xl border border-mgray p-6">
              <h2 id="plan-heading" className="font-bold text-navy mb-4">Your Plan</h2>
              <dl className="space-y-3 text-sm">
                {[
                  ['Tier',      tier.charAt(0).toUpperCase()+tier.slice(1)],
                  ['Model',     model.toUpperCase()],
                  ['Seats',     `${limits.seats === -1 ? 'Unlimited' : limits.seats}`],
                  ['Price',     `$${price.monthly}/mo`],
                  ['Agents',    limits.agentsEnabled === -1 ? 'All 39' : `${limits.agentsEnabled} of 39`],
                  ['KB Storage',`${limits.kbStorageGb}GB`],
                  ['GEO Engines',String(limits.geoEngines)],
                  ['Vercel Edge', limits.vercelEdge ? 'Enabled' : 'Upgrade'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-navy">{v}</dd>
                  </div>
                ))}
              </dl>
              <a href={`/auth/signup?tier=growth&model=${model}`}
                className="btn btn-secondary w-full justify-center text-sm mt-5">
                Upgrade to Growth
              </a>
            </section>
          </div>

          {/* Reddit HITL queue */}
          <section aria-labelledby="hitl-heading" className="mt-6 bg-white rounded-xl border border-amber-200 p-6">
            <h2 id="hitl-heading" className="font-bold text-amber-800 mb-1 flex items-center gap-2">
              <span aria-hidden="true">⚠</span> Reddit Threads Awaiting Approval
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              The Reddit Manager found 2 relevant threads. Human approval required before any response is posted.
            </p>
            <ul className="space-y-3" aria-label="Threads awaiting approval">
              {[
                { id:'t_abc123', sub:'r/marketing',  title:'Best AI tools for content marketing in 2026?', draft:'Virilocity's GEO engine tracks AI search citations across 7 engines…' },
                { id:'t_def456', sub:'r/SaaS',       title:'How do you track brand mentions across AI chatbots?', draft:'Great question — our AI Visibility Tracker scans ChatGPT, Claude, Gemini…' },
              ].map(thread => (
                <li key={thread.id} className="border border-mgray rounded-lg p-4">
                  <p className="text-xs text-teal font-semibold mb-0.5">{thread.sub}</p>
                  <p className="font-medium text-navy text-sm mb-1">{thread.title}</p>
                  <p className="text-xs text-slate-500 mb-3 italic">Draft: "{thread.draft}"</p>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary text-xs px-3 py-1.5"
                      aria-label={`Approve response to: ${thread.title}`}>
                      Approve & Post
                    </button>
                    <button className="btn border border-mgray text-slate-600 text-xs px-3 py-1.5 hover:bg-lgray"
                      aria-label={`Reject response to: ${thread.title}`}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

        </main>
      </div>
    </>
  );
}
