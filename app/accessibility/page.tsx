// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Accessibility Statement  ·  TEVV F-04
// Required for: Microsoft AppSource · WCAG 2.2 conformance declaration
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: 'Virilocity accessibility conformance and contact information.',
};

export default function AccessibilityPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      {/* WCAG 2.4.6: descriptive heading */}
      <h1 className="text-3xl font-bold text-navy mb-6">Accessibility Statement</h1>

      <p className="text-slate-600 mb-4">
        <strong>CloudOneSoftware LLC</strong> is committed to ensuring digital
        accessibility for people with disabilities. We continually improve the
        user experience for everyone and apply relevant accessibility standards.
      </p>

      <section aria-labelledby="conformance-heading">
        <h2 id="conformance-heading" className="text-xl font-bold text-navy mt-8 mb-3">
          Conformance Status
        </h2>
        <p className="text-slate-600">
          Virilocity V16.4 targets conformance with the{' '}
          <a
            href="https://www.w3.org/TR/WCAG22/"
            className="text-teal underline"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Web Content Accessibility Guidelines 2.2 (opens in new tab)"
          >
            Web Content Accessibility Guidelines (WCAG) 2.2
          </a>{' '}
          at Level AA. The following criteria are fully addressed:
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-700" aria-label="WCAG 2.2 criteria addressed">
          {[
            '1.1.1 Non-text Content — all icons use aria-label or aria-hidden',
            '1.3.1 Info & Relationships — semantic HTML5 landmarks throughout',
            '1.3.5 Identify Input Purpose — autocomplete on all form fields',
            '1.4.3 Contrast Minimum — navy/white 14.6:1 ratio',
            '1.4.4 Resize Text — rem units, user scaling enabled',
            '1.4.10 Reflow — responsive at 320px, no horizontal scroll',
            '1.4.11 Non-text Contrast — 3px teal focus ring on all interactive elements',
            '2.1.1 Keyboard — full keyboard navigation, Escape closes menus',
            '2.4.1 Bypass Blocks — skip-to-main link on every page',
            '2.4.3 Focus Order — logical DOM order matches visual order',
            '2.4.6 Headings & Labels — descriptive headings at all levels',
            '2.4.7 Focus Visible — :focus-visible ring on all interactive elements',
            '2.4.11 Focus Not Obscured — scroll-padding-top matches sticky header',
            '2.5.8 Target Size — minimum 44×44px touch targets',
            '3.1.1 Language of Page — lang="en" on <html>',
            '3.2.1 On Focus — no context change on focus events',
            '3.3.1 Error Identification — aria-live error regions',
            '4.1.2 Name, Role, Value — ARIA attributes on all custom components',
            '4.1.3 Status Messages — aria-live="polite" status region',
          ].map(criterion => (
            <li key={criterion} className="flex gap-2">
              <span aria-hidden="true" className="text-teal">✓</span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="technical-heading">
        <h2 id="technical-heading" className="text-xl font-bold text-navy mt-8 mb-3">
          Technical Specifications
        </h2>
        <ul className="text-slate-600 space-y-1 text-sm">
          <li>HTML5 semantic markup</li>
          <li>CSS with prefers-reduced-motion and forced-colors media queries</li>
          <li>JavaScript — keyboard events handled throughout</li>
          <li>WAI-ARIA 1.2 supplemental roles where needed</li>
        </ul>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="text-xl font-bold text-navy mt-8 mb-3">
          Feedback & Contact
        </h2>
        <p className="text-slate-600">
          We welcome your feedback. If you experience accessibility barriers,
          please contact us:
        </p>
        <address className="mt-3 not-italic text-slate-700">
          <strong>CloudOneSoftware LLC</strong><br />
          Email:{' '}
          <a href="mailto:accessibility@virilocity.io" className="text-teal underline">
            accessibility@virilocity.io
          </a><br />
          Response time: within 2 business days
        </address>
      </section>

      <p className="text-sm text-slate-400 mt-12">
        Last reviewed: April 2026 · Virilocity V16.4.0
      </p>
    </main>
  );
}
