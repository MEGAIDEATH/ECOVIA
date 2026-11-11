'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';

const TABS = [
  { href: '/specialist', label: 'الرئيسية' },
  { href: '/specialist/requests', label: 'طلبات الخدمة العامة' },
  { href: '/specialist/services', label: 'الخدمات' },
  { href: '/specialist/cv', label: 'السيرة الذاتية (CV)' },
  { href: '/specialist/messages', label: 'المراسلات' },
] as const;

/** Specialist workspace header (CV printing lives on the CV page). */
export function SpecialistDashboardHeader() {
  return <DashboardHeader title="مرحباً، أخصائي" subtitle="لوحة التحكم والخدمات" icon="eco" tabs={TABS} />;
}
