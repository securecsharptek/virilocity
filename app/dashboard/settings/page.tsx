// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Settings Page
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import Card   from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input  from '../../../components/ui/Input';

export const metadata: Metadata = { title: 'Settings — Dashboard' };

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-navy mb-6">Settings</h1>

      {/* Profile */}
      <Card title="Profile" className="mb-6">
        <form className="space-y-4" aria-label="Update profile settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full name"    name="name"  type="text"  autoComplete="name"  placeholder="Jane Smith" />
            <Input label="Work email"   name="email" type="email" autoComplete="email" placeholder="jane@company.com" />
          </div>
          <Button variant="secondary" size="sm">Save Profile</Button>
        </form>
      </Card>

      {/* Integrations */}
      <Card title="Connected Integrations" className="mb-6">
        <ul className="divide-y divide-mgray" aria-label="Integration connection status">
          {[
            { name:'HubSpot CRM',        href:'/api/hubspot/auth',   status:'disconnected', color:'neutral' },
            { name:'Microsoft 365',       href:'/api/m365/auth',      status:'disconnected', color:'neutral' },
            { name:'Stripe',              href:'/dashboard/billing',  status:'connected',    color:'success' },
            { name:'Google Analytics',    href:'#',                   status:'coming soon',  color:'neutral' },
          ].map(({ name, href, status, color }) => (
            <li key={name} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-navy">{name}</p>
                <p className="text-xs text-slate-400 capitalize">{status}</p>
              </div>
              {status !== 'coming soon' && status !== 'connected' && (
                <a href={href}
                  className="text-xs font-semibold text-teal hover:underline"
                  aria-label={`Connect ${name}`}>
                  Connect →
                </a>
              )}
              {status === 'connected' && (
                <span className="text-xs font-semibold text-green-700">✓ Connected</span>
              )}
              {status === 'coming soon' && (
                <span className="text-xs text-slate-400">Coming soon</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* API key */}
      <Card title="API Access">
        <p className="text-sm text-slate-500 mb-3">
          Use the Virilocity REST API to integrate agents into your own systems.
          The API uses RS256 JWT authentication.
        </p>
        <div className="flex gap-2">
          <Input label="" name="apikey" type="password"
            value="vrly_sk_••••••••••••••••••••••••••••••••"
            readOnly aria-label="Your API secret key (hidden)"
            hint="Never share your API key — treat it like a password" />
          <div className="flex items-end flex-shrink-0">
            <Button variant="outline" size="sm" aria-label="Regenerate API key">Regenerate</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
