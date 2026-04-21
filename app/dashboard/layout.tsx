'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Dashboard Layout
// Sidebar nav · B2B/B2C aware · WCAG 2.2 navigation landmark
// ─────────────────────────────────────────────────────────────────────────────
import { useState }     from 'react';
import { usePathname }  from 'next/navigation';
import NavBar           from '../../components/layout/NavBar';
import Badge            from '../../components/ui/Badge';
import { VERSION }      from '../../lib/types/index';

const NAV_ITEMS = [
  { href: '/dashboard',          icon: '▦',  label: 'Overview'       },
  { href: '/dashboard/agents',   icon: '⚡',  label: 'Agents'         },
  { href: '/dashboard/kb',       icon: '📚', label: 'Knowledge Base' },
  { href: '/dashboard/org',      icon: '🏢', label: 'Organization',  b2bOnly: true },
  { href: '/dashboard/billing',  icon: '💳', label: 'Billing'        },
  { href: '/dashboard/settings', icon: '⚙',  label: 'Settings'       },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const tier  = 'pro';   // Production: from auth() session
  const model = 'b2b';  // Production: from auth() session

  return (
    <div className="min-h-screen bg-lgray">
      <NavBar />

      <div className="flex">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <nav
          id="sidebar"
          aria-label="Dashboard navigation"
          className={[
            'fixed lg:static inset-y-0 left-0 z-30 w-60 bg-navy',
            'transform transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            'flex flex-col pt-16 lg:pt-0',
          ].join(' ')}
        >
          {/* Brand in sidebar */}
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-white font-bold text-sm truncate">
              {model === 'b2b' ? 'Acme Corp' : 'My Workspace'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="teal" className="text-xs capitalize">{tier}</Badge>
              <Badge variant="neutral" className="text-xs uppercase">{model}</Badge>
            </div>
          </div>

          {/* Nav links */}
          <ul className="flex-1 px-3 py-4 space-y-0.5 list-none" role="list">
            {NAV_ITEMS.filter(item => !item.b2bOnly || model === 'b2b').map(item => (
              <li key={item.href} role="listitem">
                <a
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <span aria-hidden="true" className="w-4 flex-shrink-0">{item.icon}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Footer info */}
          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-xs text-slate-500">V{VERSION} · TEVV 95.4/100</p>
            <a
              href="/api/platform"
              className="text-xs text-teal hover:underline"
              target="_blank"
              rel="noopener"
              aria-label="View platform status (opens in new tab)"
            >
              Platform Status
            </a>
          </div>
        </nav>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Mobile sidebar toggle */}
          <div className="lg:hidden px-4 py-3 bg-white border-b border-mgray flex items-center">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 rounded-lg hover:bg-lgray transition-colors"
            >
              <span aria-hidden="true" className="text-navy font-bold">{sidebarOpen ? '✕' : '☰'}</span>
            </button>
            <span className="ml-3 text-sm font-medium text-navy">Dashboard</span>
          </div>

          {/* Page content */}
          <main id="main-content" tabIndex={-1} className="p-6 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
