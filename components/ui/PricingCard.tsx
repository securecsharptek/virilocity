// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — PricingCard  ·  WCAG 2.2 compliant
// WCAG: 1.3.1 Info/Relationships, 1.4.3 Contrast, 2.5.8 Target Size
// ─────────────────────────────────────────────────────────────────────────────
import type { Tier, TenantModel } from '../../lib/types/index';
import { TIER_LIMITS } from '../../lib/types/index';

interface Props {
  tier:   Tier;
  price:  { monthly: number; annual: number };
  limits: typeof TIER_LIMITS[Tier];
  model:  TenantModel;
}

const TIER_LABELS: Record<Tier, string> = {
  free:       'Free',
  starter:    'Starter',
  pro:        'Pro',
  growth:     'Growth',
  scale:      'Scale',
  enterprise: 'Enterprise',
};

const FEATURED_TIERS: Set<Tier> = new Set(['pro', 'growth']);

export default function PricingCard({ tier, price, limits, model }: Props) {
  const isFeatured = FEATURED_TIERS.has(tier);
  const isEnterprise = tier === 'enterprise';
  const displayPrice = price.monthly === 0 && !isEnterprise ? 'Free' :
                       isEnterprise ? 'Custom' :
                       `$${price.monthly}`;

  const cardClass = isFeatured
    ? 'bg-navy text-white border-2 border-teal'
    : 'bg-white text-slate-900 border border-mgray';

  return (
    // WCAG 4.1.2: article role with accessible name
    <article
      className={`rounded-xl p-6 flex flex-col h-full ${cardClass}`}
      aria-labelledby={`plan-${tier}-name`}
      aria-describedby={`plan-${tier}-desc`}
    >
      {/* WCAG 1.3.1: heading hierarchy */}
      <h3 id={`plan-${tier}-name`} className="text-xl font-bold mb-1">
        {TIER_LABELS[tier]}
        {isFeatured && (
          <span
            className="ml-2 text-xs bg-teal text-white px-2 py-0.5 rounded-full align-middle"
            aria-label="Most popular plan"
          >
            Popular
          </span>
        )}
      </h3>

      {/* WCAG 1.3.1: price as meaningful text, not just visual */}
      <p
        id={`plan-${tier}-desc`}
        className="text-3xl font-bold mt-2 mb-1"
        aria-label={`${displayPrice}${price.monthly > 0 ? ' per month' : ''}`}
      >
        {displayPrice}
        {price.monthly > 0 && !isEnterprise && (
          <span className="text-sm font-normal opacity-70 ml-1">/mo</span>
        )}
      </p>

      {price.annual > 0 && !isEnterprise && (
        <p className="text-sm opacity-70 mb-4" aria-label={`Or $${price.annual} per month billed annually`}>
          ${price.annual}/mo billed annually
        </p>
      )}

      {/* Features list — WCAG 1.3.1: meaningful list */}
      <ul
        className="mt-4 flex-1 space-y-2"
        aria-label={`Features included in ${TIER_LABELS[tier]} plan`}
      >
        {getFeatures(tier, limits, model).map(({ feature, included }) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={included ? 'text-teal font-bold' : 'opacity-30'}
            >
              {included ? '✓' : '✗'}
            </span>
            <span className={included ? '' : 'opacity-50 line-through'}>
              {feature}
            </span>
            {/* WCAG 4.1.3: SR-only inclusion status */}
            <span className="sr-only">{included ? 'Included' : 'Not included'}</span>
          </li>
        ))}
      </ul>

      {/* CTA — WCAG 2.4.6: descriptive, 2.5.8: min 44px target */}
      <a
        href={isEnterprise ? '/contact-sales' : `/auth/signup?tier=${tier}`}
        className={`mt-6 btn w-full justify-center ${isFeatured ? 'btn-secondary' : 'btn-primary'}`}
        aria-label={
          isEnterprise
            ? 'Contact sales for Enterprise pricing'
            : `Get started with ${TIER_LABELS[tier]} plan for ${displayPrice}${price.monthly > 0 ? ' per month' : ''}`
        }
      >
        {isEnterprise ? 'Contact Sales' : tier === 'free' ? 'Start Free' : 'Get Started'}
      </a>
    </article>
  );
}

function getFeatures(tier: Tier, limits: typeof TIER_LIMITS[Tier], model: TenantModel) {
  const allAgents  = limits.agentsEnabled === -1;
  const agentLabel = allAgents ? 'All 39 AI agents' : `${limits.agentsEnabled} AI agents`;

  return [
    { feature: agentLabel,                                              included: true },
    { feature: `${limits.seats === -1 ? 'Unlimited' : limits.seats} seat${limits.seats === 1 ? '' : 's'}`, included: model === 'b2b' || tier === 'free' || limits.seats <= 1 },
    { feature: 'GEO content generation',                               included: limits.geoEngines >= 2 },
    { feature: 'HubSpot CRM integration',                              included: tier !== 'free' },
    { feature: 'Microsoft 365 integration',                            included: tier !== 'free' },
    { feature: 'Vercel Edge deployment',                               included: limits.vercelEdge },
    { feature: 'Advanced analytics dashboard',                         included: limits.advancedAnalytics },
    { feature: 'SAML 2.0 SSO',                                        included: limits.samlSso },
    { feature: 'B2B org workspace',                                    included: limits.b2bOrg },
    { feature: `${limits.kbStorageGb === -1 ? 'Unlimited' : limits.kbStorageGb === 0 ? 'No' : limits.kbStorageGb + 'GB'} knowledge base`, included: limits.kbStorageGb !== 0 },
  ];
}
