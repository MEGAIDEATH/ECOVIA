'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';

const TABS = [
  { href: '/organization', label: 'الرئيسية' },
  { href: '/organization/requests', label: 'طلبات الخدمة العامة' },
  { href: '/organization/specialists', label: 'الكفاءات (الدليل)' },
  { href: '/organization/messages', label: 'المراسلات والعقود' },
] as const;

/** Organization workspace header. */
export function OrganizationDashboardHeader() {
  return <DashboardHeader title="بوابة المنشآت" subtitle="لوحة التحكم والمواهب" icon="domain" tabs={TABS} />;
}
