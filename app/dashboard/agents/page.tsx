// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Agents Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import AgentGrid from '../../../components/dashboard/AgentGrid';
import Button    from '../../../components/ui/Button';
import Card      from '../../../components/ui/Card';
import { AGENT_COUNT, REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../lib/types/index';

export const metadata: Metadata = { title: 'Agents — Dashboard' };

export default function AgentsPage() {
  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">AI Agents</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {AGENT_COUNT} agents · Model routing: Haiku (6) · Sonnet (33) · Opus (Enterprise)
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <form method="POST" action="/api/autopilot">
            <Button type="submit" variant="secondary" size="sm"
              aria-label="Run full autopilot cycle — dispatches all enabled agents">
              <span aria-hidden="true">▶</span> Run Autopilot
            </Button>
          </form>
        </div>
      </header>

      {/* HITL Notice */}
      {REDDIT_REQUIRES_HUMAN_APPROVAL && (
        <Card className="mb-6 border-amber-200 bg-amber-50" padded>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-amber-600 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Human-in-the-Loop Active</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Reddit Manager always requires explicit human approval.
                This restriction is permanent and cannot be disabled at any tier.
                All other agents run autonomously within your configured schedule.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Model routing info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { model:'claude-haiku-4-5',    label:'Haiku',  count:6,  usage:'High-frequency agents',   color:'bg-amber-100 text-amber-800' },
          { model:'claude-sonnet-4-6',   label:'Sonnet', count:33, usage:'Default (all non-Enterprise)', color:'bg-blue-100 text-blue-800' },
          { model:'claude-opus-4-6',     label:'Opus',   count:39, usage:'Enterprise tier (all agents)', color:'bg-purple-100 text-purple-800' },
        ].map(r => (
          <div key={r.model} className="bg-white border border-mgray rounded-xl p-4"
            role="group" aria-label={`${r.label} model: ${r.count} agents`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
              <span className="text-2xl font-bold text-navy">{r.count}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono truncate">{r.model}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.usage}</p>
          </div>
        ))}
      </div>

      {/* Full agent grid */}
      <Card title="All Agents" subtitle="Status updates every autopilot cycle">
        <AgentGrid tier="pro" filter="all" />
      </Card>
    </>
  );
}
