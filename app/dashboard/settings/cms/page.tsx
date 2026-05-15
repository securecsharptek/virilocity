import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import CMSConnections from './CMSConnections';

export const metadata: Metadata = {
  title: 'CMS Connections',
  description: 'Connect your publishing platforms to Virilocity.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CMSSettingsPage() {
  const session = await auth();
  if (!session) {
    redirect('/auth/login');
  }

  return <CMSConnections />;
}
