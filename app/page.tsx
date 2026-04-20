// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Landing Page (B2B + B2C)
// WCAG 2.2 compliant: semantic HTML, aria-*, focus order, skip links
// B2B section: org/team features, SAML SSO, seat licensing
// B2C section: individual self-serve, Stripe checkout, free tier CTA
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import { PRICES, GOMEGA_REF, TIER_LIMITS } from '../lib/types/index';
import NavBar from '../components/layout/NavBar';
import PricingCard from '../components/ui/PricingCard';
import FeatureGrid from '../components/ui/FeatureGrid';

export const metadata: Metadata = {
  title: 'Virilocity — 39 AI Marketing Agents. From $79/month.',
  description: 'Full-autopilot AI marketing platform for B2B teams and individual creators. 97% cheaper than GoMega.',
};

const B2C_TIERS = ['free', 'starter', 'pro'] as const;
const B2B_TIERS = ['pro', 'growth', 'scale', 'enterprise'] as const;

export default function LandingPage() {
  return (
    <>
      {/* WCAG 1.3.1: skip link target in layout.tsx */}
      <NavBar />

      {/* WCAG 1.3.1: <main> landmark */}
      <main id="main-content" tabIndex={-1}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          className="bg-navy text-white py-24 px-6 text-center"
        >
          {/* WCAG 2.4.6: Descriptive heading */}
          <h1 id="hero-heading" className="text-5xl font-bold mb-4 leading-tight">
            39 AI Marketing Agents.
            <br />
            <span className="text-teal">Full Autopilot.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            From{' '}
            <strong className="text-gold">${PRICES.starter.monthly}/month</strong>
            {' '}— 97% cheaper than GoMega (${GOMEGA_REF.full.toLocaleString()}).
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* WCAG 2.4.6: Descriptive link text */}
            <a
              href="/auth/signup"
              className="btn btn-secondary text-lg px-8 py-3"
              aria-label="Start free — no credit card required"
            >
              Start Free
              {/* WCAG 1.1.1: decorative icon hidden from screen readers */}
              <span aria-hidden="true">→</span>
            </a>
            <a
              href="#b2b-section"
              className="btn border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-3"
              aria-label="View team and enterprise plans"
            >
              Team Plans
            </a>
          </div>
        </section>

        {/* ── B2C Section ──────────────────────────────────────────────────── */}
        <section
          id="b2c-section"
          aria-labelledby="b2c-heading"
          className="py-20 px-6 bg-white"
        >
          <div className="max-w-5xl mx-auto">
            <h2 id="b2c-heading" className="text-3xl font-bold text-navy text-center mb-3">
              For Individual Marketers & Creators
            </h2>
            <p className="text-center text-slate-600 mb-12 text-lg">
              All 39 AI agents. No team required. Cancel anytime.
            </p>

            {/* WCAG 1.3.1: list for grouped items */}
            <ul
              className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0"
              aria-label="Individual pricing plans"
            >
              {B2C_TIERS.map(tier => (
                <li key={tier}>
                  <PricingCard
                    tier={tier}
                    price={PRICES[tier]}
                    limits={TIER_LIMITS[tier]}
                    model="b2c"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── B2B Section ──────────────────────────────────────────────────── */}
        <section
          id="b2b-section"
          aria-labelledby="b2b-heading"
          className="py-20 px-6 bg-lgray"
        >
          <div className="max-w-6xl mx-auto">
            <h2 id="b2b-heading" className="text-3xl font-bold text-navy text-center mb-3">
              For Teams & Enterprises
            </h2>
            <p className="text-center text-slate-600 mb-4 text-lg">
              Seat-based licensing. SAML SSO. Microsoft 365 native integration.
              Shared knowledge base across your entire team.
            </p>

            {/* B2B feature highlights */}
            <ul
              className="flex flex-wrap gap-3 justify-center mb-12"
              aria-label="B2B features included"
            >
              {[
                'Unlimited team workspaces',
                'SAML 2.0 SSO (Enterprise)',
                'Microsoft Teams & SharePoint',
                'HubSpot CRM sync',
                'Admin dashboard',
                'Priority support',
                'SLA guarantee',
                'Audit log',
              ].map(feature => (
                <li
                  key={feature}
                  className="bg-white border border-mgray rounded-full px-4 py-1.5 text-sm font-medium text-navy"
                  aria-label={`Feature: ${feature}`}
                >
                  {/* WCAG 1.1.1: checkmark hidden from SR */}
                  <span aria-hidden="true" className="text-teal mr-1">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <ul
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0"
              aria-label="Team and enterprise pricing plans"
            >
              {B2B_TIERS.map(tier => (
                <li key={tier}>
                  <PricingCard
                    tier={tier}
                    price={PRICES[tier]}
                    limits={TIER_LIMITS[tier]}
                    model="b2b"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Feature Grid ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="features-heading"
          className="py-20 px-6 bg-white"
        >
          <div className="max-w-5xl mx-auto">
            <h2 id="features-heading" className="text-3xl font-bold text-navy text-center mb-12">
              39 AI Agents — Everything You Need
            </h2>
            <FeatureGrid />
          </div>
        </section>

        {/* ── Social Proof ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="proof-heading"
          className="bg-navy text-white py-16 px-6 text-center"
        >
          <h2 id="proof-heading" className="text-2xl font-bold mb-8">
            Trusted Architecture
          </h2>
          <dl
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
            aria-label="Platform statistics"
          >
            {[
              { value: '39', label: 'AI Agents' },
              { value: '654', label: 'Tests Passing' },
              { value: '100%', label: 'NIST TEVV' },
              { value: '$79', label: 'Starting/mo' },
            ].map(({ value, label }) => (
              <div key={label}>
                <dt className="text-4xl font-bold text-teal" aria-label={`${value} ${label}`}>
                  {value}
                </dt>
                <dd className="text-slate-300 mt-1">{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* WCAG 1.3.1: <footer> landmark */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-6" role="contentinfo">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            <strong className="text-white">CloudOneSoftware LLC</strong>
            {' '}· Jersey City, NJ · MOB/BAOB Certified · Microsoft Partner
          </p>
          <nav aria-label="Footer links">
            <ul className="flex gap-6 list-none p-0">
              {[
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/terms',   label: 'Terms of Service' },
                { href: '/accessibility', label: 'Accessibility Statement' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="hover:text-white transition-colors underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
