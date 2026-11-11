import Link from 'next/link';

import { AuthShell } from '@/components/layout/AuthShell';

const ROLES = [
  {
    href: '/register/specialist',
    icon: 'person',
    title: 'أخصائي بيئي',
    body: 'للمتخصصين في المجال البيئي: ملف مهني، طلبات المنشآت، والتعاقدات.',
    cta: 'دخول كأخصائي',
  },
  {
    href: '/register/organization',
    icon: 'domain',
    title: 'منشأة / جهة',
    body: 'للشركات والمؤسسات: طلب الخدمات البيئية والوصول إلى الأخصائيين المؤهلين.',
    cta: 'دخول كجهة',
  },
] as const;

/** Account-type choice before registration. */
export function ChooseRoleView() {
  return (
    <AuthShell
      title="إنشاء حساب"
      subtitle="اختر نوع الحساب للمتابعة."
      width="lg"
      footer={
        <>
          لديك حساب؟{' '}
          <Link href="/login" className="font-bold text-secondary hover:text-primary">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ROLES.map((role) => (
          <li key={role.href}>
            <Link
              href={role.href}
              className="card card-interactive group flex h-full flex-col p-6 no-underline"
            >
              <span className="icon-tile icon-tile-lg mb-4">
                <span aria-hidden="true" className="material-symbols-outlined text-[28px]">
                  {role.icon}
                </span>
              </span>
              <h2 className="text-lg font-bold text-forest">{role.title}</h2>
              <p className="mt-1 mb-5 text-[15px] leading-relaxed text-muted">{role.body}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-secondary group-hover:text-primary">
                {role.cta}
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
