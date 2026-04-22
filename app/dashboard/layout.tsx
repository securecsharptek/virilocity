// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Dashboard Layout (Glassmorphic Full-Width)
// No sidebar - centered content with atmospheric background
// ─────────────────────────────────────────────────────────────────────────────

// Force dynamic rendering for all dashboard routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
