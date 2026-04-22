// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Dashboard Page (Glassmorphic Design)
// WCAG 2.2 compliant · Glassmorphic UI with dark atmosphere
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Virilocity AI marketing command centre.',
};

// Force dynamic rendering - no caching, always check auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  return <DashboardClient />;
}
