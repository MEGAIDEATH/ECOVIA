'use client';

import { AuthShell } from '@/components/layout/AuthShell';

import { AdminLoginForm } from './AdminLoginForm';

interface AdminLoginPanelProps {
  onLoggedIn: () => void;
}

/** Inline admin login for /admin when there is no admin session. */
export function AdminLoginPanel({ onLoggedIn }: AdminLoginPanelProps) {
  return (
    <AuthShell title="دخول الإدارة" subtitle="بوابة الإدارة والتحكم في إيكوفيا." icon="admin_panel_settings">
      <AdminLoginForm onSuccess={onLoggedIn} autoFocus />
    </AuthShell>
  );
}
