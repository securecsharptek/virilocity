// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Feature Grid  ·  WCAG 2.2 compliant
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_GROUPS = [
  {
    group: 'SEO & Content',
    agents: ['Keyword Researcher', 'GEO Content Generator', 'SEO Auditor', 'Content Repurposer', 'Brand Voice Enforcer', 'Trend Detector'],
  },
  {
    group: 'Lead & CRM',
    agents: ['HubSpot Contact Enricher', 'Lead Scorer', 'MQL/SQL Lifecycle Manager', 'Customer Journey Mapper', 'Email Sequencer', 'Upsell Engine'],
  },
  {
    group: 'Social & Community',
    agents: ['Social Listener', 'Reddit Manager (HITL)', 'Community Manager', 'Influencer Matcher', 'PR Monitor', 'Competitor Tracker'],
  },
  {
    group: 'Revenue & Analytics',
    agents: ['Churn Predictor', 'Revenue Forecaster', 'Attribution Analyzer', 'Budget Allocator', 'CVR Optimizer', 'A/B Test Orchestrator'],
  },
  {
    group: 'Advertising & Growth',
    agents: ['Bid Optimizer', 'Ad Creative Generator', 'Backlink Outreach', 'Referral Program Manager', 'Viral Analyzer', 'AI Visibility Tracker'],
  },
  {
    group: 'Operations',
    agents: ['Autopilot Orchestrator', 'Workspace Reporter', 'Market Researcher', 'Campaign Orchestrator', 'Webinar Orchestrator', 'Landing Page Optimizer'],
  },
];

export default function FeatureGrid() {
  return (
    // WCAG 1.3.1: dl for term-description pairs
    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {AGENT_GROUPS.map(({ group, agents }) => (
        <div
          key={group}
          className="bg-lgray rounded-xl p-5 border border-mgray"
          // WCAG 4.1.2: region role for grouped content
          role="group"
          aria-labelledby={`group-${group.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <dt
            id={`group-${group.replace(/\s+/g, '-').toLowerCase()}`}
            className="font-bold text-navy text-base mb-3 flex items-center gap-2"
          >
            <span aria-hidden="true" className="text-teal">▸</span>
            {group}
          </dt>
          <dd>
            <ul className="space-y-1" aria-label={`${group} agents`}>
              {agents.map(agent => (
                <li
                  key={agent}
                  className="text-sm text-slate-600 flex items-center gap-1.5"
                >
                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                  {agent}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
