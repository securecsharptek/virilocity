// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Privacy Policy Page (AppSource required)
// GDPR compliant · Azure Key Vault mention · 90-day data retention
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Virilocity privacy policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
      <p className="text-slate-400 text-sm mb-8">Effective: April 2026 · Version 16.4</p>

      {[
        {
          title: '1. Data We Collect',
          body: 'We collect account information (name, email, organization), usage data (agent executions, feature interactions), billing information processed by Stripe, and integration tokens stored encrypted in Azure Key Vault. We do not sell personal data.',
        },
        {
          title: '2. How We Use Data',
          body: 'Account data is used to provide and improve the Virilocity platform. Usage data powers AI agent personalization and analytics. All AI content generation occurs via Anthropic Claude API under their data usage policies.',
        },
        {
          title: '3. Data Storage & Security',
          body: 'All data is stored in Microsoft Azure infrastructure. OAuth tokens and secrets are stored exclusively in Azure Key Vault with Managed Identity access — never in application config or environment variables. Database is hosted on Neon Postgres with TLS encryption in transit.',
        },
        {
          title: '4. Data Retention',
          body: 'Account data is retained while your account is active. Agent execution logs and fairness audit records are retained for 90 days. You may request deletion by emailing privacy@virilocity.io.',
        },
        {
          title: '5. Microsoft 365 Data',
          body: 'When you connect Microsoft 365, we access your Teams, Outlook, and SharePoint data only to provide features you explicitly configure. We request minimum necessary Graph API permissions. Microsoft 365 tokens are stored in Azure Key Vault and never logged.',
        },
        {
          title: '6. HubSpot & Stripe Data',
          body: 'HubSpot contact and deal data is accessed only through your connected HubSpot account. Stripe payment processing is governed by Stripe\'s privacy policy — we store only subscription metadata, not card details.',
        },
        {
          title: '7. Your Rights (GDPR)',
          body: 'You have the right to access, correct, export, or delete your personal data. To exercise these rights, contact privacy@virilocity.io. We respond within 30 days.',
        },
        {
          title: '8. Contact',
          body: 'CloudOneSoftware LLC · Jersey City, NJ · privacy@virilocity.io',
        },
      ].map(({ title, body }) => (
        <section key={title} aria-labelledby={title.replace(/\s+/g, '-').toLowerCase()} className="mb-8">
          <h2 id={title.replace(/\s+/g, '-').toLowerCase()} className="text-xl font-bold text-navy mb-2">{title}</h2>
          <p className="text-slate-600 leading-relaxed">{body}</p>
        </section>
      ))}
    </main>
  );
}
