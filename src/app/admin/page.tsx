import type { Metadata } from 'next';

import { AdminEntry } from '@/features/admin/AdminEntry';

export const metadata: Metadata = { title: 'بوابة الإدارة', robots: { index: false } };

/**
 * Admin portal. The dashboard stays a lazily loaded client island so its code
 * never ships with public pages; every admin API re-checks role=admin.
 */
export default function AdminPage() {
  return <AdminEntry />;
}
