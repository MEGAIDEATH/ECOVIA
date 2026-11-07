'use client';

import dynamic from 'next/dynamic';

import { Spinner } from '@/components/ui/Spinner';

/**
 * `/admin` is the ONLY entry point for the admin dashboard, and the component
 * is loaded lazily (never server-rendered) so its module graph — the admin
 * repository and the `/api/admin/accounts` calls — can never be pulled into a
 * public route bundle or executed by public pages.
 */
const AdminDashboard = dynamic(
  () => import('@/features/admin/AdminDashboard').then((module) => module.AdminDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spinner className="w-12 h-12 border-4" />
      </div>
    ),
  },
);

export default function AdminPage() {
  return <AdminDashboard />;
}