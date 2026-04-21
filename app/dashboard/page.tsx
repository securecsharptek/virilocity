// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Dashboard Page (Glassmorphic Design)
// WCAG 2.2 compliant · Glassmorphic UI with dark atmosphere
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import DashboardClient from './DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Virilocity AI marketing command centre.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
