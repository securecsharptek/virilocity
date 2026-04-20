// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Organization Dashboard Page (B2B)
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import Card   from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input  from '../../../components/ui/Input';
import Badge  from '../../../components/ui/Badge';
import { TIER_LIMITS } from '../../../lib/types/index';

export const metadata: Metadata = { title: 'Organization — Dashboard' };

export default function OrgPage() {
  const tier   = 'pro';
  const limits = TIER_LIMITS[tier];

  if (!limits.b2bOrg) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3" aria-hidden="true">🏢</p>
        <h1 className="text-xl font-bold text-navy mb-2">B2B Organizations require Pro tier</h1>
        <p className="text-slate-500 text-sm mb-4">
          Upgrade to Pro to create an organization, invite team members, and share agents.
        </p>
        <a href="/dashboard/billing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-navy text-white px-4 py-2.5 rounded-lg hover:bg-navy/90">
          Upgrade to Pro →
        </a>
      </div>
    );
  }

  const seatsUsed  = 2;
  const seatsTotal = limits.seats;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Organization</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage team members, roles, and M365 / SSO settings
        </p>
      </header>

      {/* Seat usage */}
      <Card className="mb-6" padded>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-navy">Seat Usage</p>
            <p className="text-2xl font-bold text-teal mt-0.5">
              {seatsUsed}
              <span className="text-base font-normal text-slate-400 ml-1">
                / {seatsTotal === -1 ? 'unlimited' : seatsTotal}
              </span>
            </p>
          </div>
          <div className="text-right">
            <Badge variant={seatsUsed >= (seatsTotal === -1 ? Infinity : seatsTotal) ? 'danger' : 'success'}>
              {seatsTotal === -1 ? 'Unlimited' : `${seatsTotal - seatsUsed} remaining`}
            </Badge>
            <p className="text-xs text-slate-400 mt-1">
              <a href="/dashboard/billing" className="text-teal underline">Upgrade</a> for more seats
            </p>
          </div>
        </div>
      </Card>

      {/* Invite member */}
      <Card title="Invite Team Member" className="mb-6">
        <form method="POST" action="/api/org/invite" className="flex flex-col sm:flex-row gap-3"
          aria-label="Invite a new team member">
          <div className="flex-1">
            <Input label="Email address" name="email" type="email"
              required autoComplete="email" placeholder="colleague@company.com" />
          </div>
          <div className="sm:w-36">
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select id="role" name="role" className="input">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="md"
              aria-label="Send invitation email">
              Send Invite
            </Button>
          </div>
        </form>
      </Card>

      {/* Members table */}
      <Card title="Members" subtitle={`${seatsUsed} active`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Organization members">
            <thead>
              <tr className="border-b border-mgray">
                {['Member', 'Role', 'Joined', 'Actions'].map(h => (
                  <th key={h} scope="col"
                    className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name:'You (Owner)', email:'owner@company.com',   role:'owner',  joined:'Jan 2026' },
                { name:'Jane Smith',  email:'jane@company.com',    role:'admin',  joined:'Feb 2026' },
              ].map(member => (
                <tr key={member.email} className="border-b border-mgray last:border-0">
                  <td className="py-3 px-3">
                    <p className="font-medium text-navy">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={member.role === 'owner' ? 'navy' : member.role === 'admin' ? 'teal' : 'neutral'}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-500">{member.joined}</td>
                  <td className="py-3 px-3">
                    {member.role !== 'owner' && (
                      <button className="text-xs text-danger hover:underline"
                        aria-label={`Remove ${member.name} from organization`}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SSO / M365 */}
      <Card title="Microsoft 365 & SSO" className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy">Microsoft Entra ID SSO</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {limits.samlSso
                ? 'SAML 2.0 SSO available on Enterprise tier'
                : 'Upgrade to Enterprise to enable SAML SSO'}
            </p>
          </div>
          {limits.samlSso ? (
            <Button variant="secondary" size="sm">Configure SSO</Button>
          ) : (
            <Badge variant="neutral">Enterprise only</Badge>
          )}
        </div>
        <div className="border-t border-mgray mt-4 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy">Microsoft 365 Integration</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Teams · SharePoint · Outlook · Calendar
            </p>
          </div>
          <a href="/api/m365/auth"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-navy text-white px-3 py-2 rounded-lg hover:bg-navy/90"
            aria-label="Connect Microsoft 365 account">
            Connect M365
          </a>
        </div>
      </Card>
    </>
  );
}
