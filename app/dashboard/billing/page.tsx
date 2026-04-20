// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Billing Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import Card   from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge  from '../../../components/ui/Badge';
import { PRICES, TIER_LIMITS, GOMEGA_REF } from '../../../lib/types/index';

export const metadata: Metadata = { title: 'Billing — Dashboard' };

const UPGRADE_TIERS = [
  { id:'starter', monthly:79,  annual:63,  seats:1,   agents:10, highlight:false },
  { id:'pro',     monthly:399, annual:319, seats:5,   agents:20, highlight:true  },
  { id:'growth',  monthly:699, annual:559, seats:20,  agents:39, highlight:false },
  { id:'scale',   monthly:999, annual:799, seats:100, agents:39, highlight:false },
] as const;

export default function BillingPage() {
  const currentTier  = 'free';
  const currentPrice = PRICES[currentTier].monthly;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Billing & Plan</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your subscription · All plans 97% cheaper than GoMega (${GOMEGA_REF.full.toLocaleString()}/mo)
        </p>
      </header>

      {/* Current plan */}
      <Card title="Current Plan" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xl font-bold text-navy capitalize">{currentTier} Plan</p>
              <Badge variant={currentTier === 'free' ? 'neutral' : 'success'}>Active</Badge>
            </div>
            <p className="text-slate-500 text-sm">
              {currentPrice === 0 ? 'No charge' : `$${currentPrice}/month`}
              {' · '}
              {TIER_LIMITS[currentTier].agentsEnabled} agents
              {' · '}
              {TIER_LIMITS[currentTier].seats} seat{TIER_LIMITS[currentTier].seats !== 1 ? 's' : ''}
            </p>
          </div>
          {currentTier !== 'free' && (
            <Button variant="outline" size="sm"
              aria-label="Manage subscription in Stripe customer portal">
              Manage Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Upgrade options */}
      <section aria-labelledby="upgrade-heading">
        <h2 id="upgrade-heading" className="text-lg font-bold text-navy mb-4">
          Upgrade Your Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {UPGRADE_TIERS.map(tier => (
            <article
              key={tier.id}
              aria-labelledby={`tier-${tier.id}`}
              className={[
                'rounded-xl border p-5 flex flex-col',
                tier.highlight
                  ? 'bg-navy border-teal border-2'
                  : 'bg-white border-mgray',
              ].join(' ')}
            >
              {tier.highlight && (
                <Badge variant="teal" className="self-start mb-2 text-xs">Most Popular</Badge>
              )}
              <h3 id={`tier-${tier.id}`}
                className={`text-lg font-bold capitalize mb-1 ${tier.highlight ? 'text-white' : 'text-navy'}`}>
                {tier.id}
              </h3>
              <p className={`text-3xl font-bold mb-1 ${tier.highlight ? 'text-teal' : 'text-teal'}`}
                aria-label={`$${tier.monthly} per month`}>
                ${tier.monthly}
                <span className={`text-sm font-normal ml-1 ${tier.highlight ? 'text-slate-300' : 'text-slate-400'}`}>/mo</span>
              </p>
              <p className={`text-xs mb-4 ${tier.highlight ? 'text-slate-400' : 'text-slate-400'}`}>
                ${tier.annual}/mo billed annually
              </p>
              <ul className={`text-xs space-y-1.5 mb-5 flex-1 ${tier.highlight ? 'text-slate-300' : 'text-slate-600'}`}
                aria-label={`${tier.id} plan features`}>
                {[
                  `${tier.agents === 39 ? 'All 39' : tier.agents} AI agents`,
                  `${tier.seats} seat${tier.seats !== 1 ? 's' : ''}`,
                  tier.id !== 'starter' ? 'B2B org workspace' : 'Individual use',
                  TIER_LIMITS[tier.id].vercelEdge ? 'Vercel Edge' : '',
                  TIER_LIMITS[tier.id].advancedAnalytics ? 'Advanced analytics' : '',
                ].filter(Boolean).map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="text-teal">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={`/api/billing/checkout?tier=${tier.id}&cycle=monthly`}
                className={[
                  'block text-center text-sm font-semibold py-2.5 rounded-lg transition-colors',
                  tier.highlight
                    ? 'bg-teal text-white hover:bg-teal/90'
                    : 'bg-navy text-white hover:bg-navy/90',
                ].join(' ')}
                aria-label={`Upgrade to ${tier.id} plan for $${tier.monthly} per month`}
              >
                {currentTier === tier.id ? 'Current Plan' : `Upgrade to ${tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}`}
              </a>
            </article>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          All plans include a 14-day free trial · Cancel anytime · No setup fees ·
          Enterprise pricing: <a href="mailto:sales@virilocity.io" className="text-teal underline">sales@virilocity.io</a>
        </p>
      </section>
    </>
  );
}
