// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Microsoft Teams Tab Page
// Served at: /teams (configured in TEAMS_APP_MANIFEST staticTabs)
// Teams SSO via webApplicationInfo (Entra ID)
// WCAG 2.2 compliant — runs inside Teams iframe
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import KPICard  from '../../components/dashboard/KPICard';
import AgentGrid from '../../components/dashboard/AgentGrid';
import Badge from '../../components/ui/Badge';
import { VERSION, REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../lib/types/index';

export const metadata: Metadata = {
  title: 'Virilocity — Teams',
  description: 'Virilocity AI Marketing Autopilot — Microsoft Teams integration.',
};

export default function TeamsPage() {
  return (
    // Teams iframe: light bg, compact layout
    <div className="min-h-screen bg-lgray p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-navy flex items-center gap-2">
            <span aria-hidden="true">⚡</span> Virilocity
            <Badge variant="teal" className="text-xs">V{VERSION}</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">AI Marketing Autopilot · Teams Integration</p>
        </div>
        <Badge variant="success" dot>Connected</Badge>
      </header>

      {/* Weekly KPI summary */}
      <section aria-labelledby="teams-kpi-heading" className="mb-4">
        <h2 id="teams-kpi-heading" className="text-sm font-bold text-navy mb-3">
          Weekly Performance
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <KPICard label="ROAS"         value="3.8"  unit="x"  trend="up"   trendLabel="+0.4 vs last week" color="teal"  />
          <KPICard label="AI Visibility" value="74"   unit="%"  trend="up"   trendLabel="+6pts"             color="navy"  />
          <KPICard label="MQLs"          value="12"   unit=""   trend="flat" trendLabel="Stable"            color="green" />
          <KPICard label="Content"       value="7"    unit="pcs" trend="up"  trendLabel="+2 vs last week"   color="amber" />
        </dl>
      </section>

      {/* HITL alert */}
      <section
        aria-labelledby="hitl-teams-heading"
        className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3"
      >
        <h2 id="hitl-teams-heading" className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-1">
          <span aria-hidden="true">⚠</span>
          Reddit Threads Awaiting Approval
        </h2>
        <p className="text-xs text-slate-600 mb-2">
          {REDDIT_REQUIRES_HUMAN_APPROVAL
            ? 'Human approval required before any Reddit response is posted.'
            : ''}
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center text-xs text-teal font-semibold underline"
          target="_blank"
          rel="noopener"
          aria-label="Review threads in Virilocity dashboard (opens in new tab)"
        >
          Review in Dashboard <span aria-hidden="true" className="ml-1">↗</span>
        </a>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="teams-actions-heading" className="mb-4">
        <h2 id="teams-actions-heading" className="text-sm font-bold text-navy mb-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Run Autopilot',     href: '/api/autopilot',        icon: '▶' },
            { label: 'View All Agents',   href: '/dashboard#agents',     icon: '🤖' },
            { label: 'Knowledge Base',    href: '/dashboard#kb',         icon: '📚' },
            { label: 'Billing & Plan',    href: '/dashboard#billing',    icon: '💳' },
          ].map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener"
              aria-label={`${label} (opens in new tab)`}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-mgray rounded-lg text-xs font-medium text-navy hover:bg-lgray transition-colors"
            >
              <span aria-hidden="true" className="text-base">{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* Agent status compact */}
      <section aria-labelledby="teams-agents-heading">
        <h2 id="teams-agents-heading" className="text-sm font-bold text-navy mb-2">
          Active Agents
        </h2>
        <AgentGrid tier="pro" filter="active" />
      </section>

      <footer className="mt-6 text-center text-xs text-slate-400">
        <a href="/privacy" className="underline hover:text-navy">Privacy</a>
        {' · '}
        <a href="/terms"   className="underline hover:text-navy">Terms</a>
        {' · '}
        <a href="/accessibility" className="underline hover:text-navy">Accessibility</a>
      </footer>
    </div>
  );
}
