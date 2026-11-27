import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/Feedback';
import { MetricTile } from '@/components/ui/MetricTile';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestCard } from '@/features/marketplace/RequestCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { countOffersAwaitingReview, countPendingContracts } from '@/repositories/marketplace';
import { countUnreadNotifications } from '@/repositories/notifications';
import { countRequestsByStatusForOrganization, listRequestsForOrganization } from '@/repositories/serviceRequests';

export const metadata: Metadata = { title: 'الرئيسية — المنشأة' };

const ACTIONS = [
  { href: '/organization/requests/new', icon: 'campaign', title: 'طلب خدمة جديد', body: 'حدّد نوع الخدمة وصف نشاطك ليقدّم الأخصائيون عروضهم.' },
  { href: '/organization/specialists', icon: 'search', title: 'دليل الكفاءات', body: 'تصفّح الأخصائيين المعتمدين وأرسل طلباً خاصاً لأحدهم.' },
  { href: '/organization/messages', icon: 'handshake', title: 'المراسلات والعقود', body: 'تابع محادثاتك مع الأخصائيين وعقودك.' },
] as const;

/** Facility home: live counters and the open requests with their offer counts. */
export default async function OrganizationHomePage() {
  const { account, profile } = await requireWorkspacePage('org', 'approved', '/organization');
  const [byStatus, offersToReview, pendingContracts, unread, open] = await Promise.all([
    countRequestsByStatusForOrganization(profile.id),
    countOffersAwaitingReview(profile.id),
    countPendingContracts({ organizationId: profile.id }),
    countUnreadNotifications(account.user.id),
    listRequestsForOrganization(profile.id, 'open', 1),
  ]);

  return (
    <div className="fade-up space-y-8">
      <PageHeader title={`مرحباً، ${profile.orgName}`} description="ملخص طلباتك والعروض والعقود." />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <li>
          <MetricTile icon="assignment" value={byStatus.pending} label="طلبات مفتوحة للعروض" tone="warning" href="/organization/requests" />
        </li>
        <li>
          <MetricTile icon="local_offer" value={offersToReview} label="عروض بانتظار مراجعتك" tone="info" href="/organization/requests" />
        </li>
        <li>
          <MetricTile icon="contract_edit" value={pendingContracts} label="عقود بانتظار توقيع الأخصائي" tone="brand" href="/organization/requests" />
        </li>
        <li>
          <MetricTile
            icon="handshake"
            value={byStatus.accepted + byStatus.in_progress}
            label="تعاقدات جارية"
            tone="success"
            href="/organization/requests?tab=contracted"
          />
        </li>
        <li>
          <MetricTile
            icon="notifications"
            value={unread}
            label="إشعارات غير مقروءة"
            tone={unread > 0 ? 'danger' : 'neutral'}
            href="/organization/notifications"
            testId="home-notification-counter"
          />
        </li>
      </ul>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ACTIONS.map((action) => (
          <li key={action.href}>
            <Link href={action.href} className="card card-interactive flex h-full flex-col p-5 no-underline">
              <span className="icon-tile mb-3">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
                  {action.icon}
                </span>
              </span>
              <span className="mb-1 font-bold text-forest">{action.title}</span>
              <span className="text-sm leading-relaxed text-muted">{action.body}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="open-requests" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="open-requests" className="text-lg font-bold text-forest">
            الطلبات المفتوحة
          </h3>
          <Link href="/organization/requests" className="btn btn-soft btn-sm">
            كل الطلبات
          </Link>
        </div>
        {open.items.length === 0 ? (
          <div className="card">
            <EmptyState message="لا توجد طلبات مفتوحة. انشر طلباً جديداً لتصلك عروض الأخصائيين." />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {open.items.slice(0, 4).map((request) => (
              <li key={request.id}>
                <RequestCard request={request} href={`/organization/requests/${request.id}`} viewer="org" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
