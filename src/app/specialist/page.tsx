import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/Feedback';
import { MetricTile } from '@/components/ui/MetricTile';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestCard } from '@/features/marketplace/RequestCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { countPendingContracts } from '@/repositories/marketplace';
import { countUnreadNotifications } from '@/repositories/notifications';
import { countRequestsForSpecialist, listRequestsForSpecialist } from '@/repositories/serviceRequests';

export const metadata: Metadata = { title: 'الرئيسية — الأخصائي' };

/** Specialist home: live counters (requests, offers, contracts, services, notifications). */
export default async function SpecialistHomePage() {
  const { account, profile } = await requireWorkspacePage('spec', 'approved', '/specialist');
  const viewer = { id: profile.id, userId: account.user.id };
  const [counts, pendingContracts, unread, latest] = await Promise.all([
    countRequestsForSpecialist(viewer),
    countPendingContracts({ specialistId: profile.id }),
    countUnreadNotifications(account.user.id),
    listRequestsForSpecialist(viewer, 'open', { page: 1 }),
  ]);

  return (
    <div className="fade-up space-y-6">
      <PageHeader title={`مرحباً، ${profile.fullName}`} description="ملخص نشاطك على إيكوفيا." />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <li>
          <MetricTile icon="assignment" value={counts.open} label="طلبات متاحة لك" tone="warning" href="/specialist/requests" />
        </li>
        <li>
          <MetricTile icon="lock" value={counts.privateOpen} label="طلبات خاصة لك" tone="brand" href="/specialist/requests" />
        </li>
        <li>
          <MetricTile icon="local_offer" value={counts.activeOffers} label="عروضي النشطة" tone="info" href="/specialist/requests?tab=offers" />
        </li>
        <li>
          <MetricTile icon="contract_edit" value={pendingContracts} label="عقود بانتظار توقيعك" tone="warning" href="/specialist/requests?tab=offers" />
        </li>
        <li>
          <MetricTile icon="work_history" value={counts.ongoing} label="خدمات جارية" tone="success" href="/specialist/services" />
        </li>
        <li>
          <MetricTile
            icon="notifications"
            value={unread}
            label="إشعارات غير مقروءة"
            tone={unread > 0 ? 'danger' : 'neutral'}
            href="/specialist/notifications"
            testId="home-notification-counter"
          />
        </li>
      </ul>

      <section className="space-y-3" aria-labelledby="latest-requests">
        <div className="flex items-center justify-between gap-3">
          <h3 id="latest-requests" className="text-lg font-bold text-forest">
            أحدث الطلبات المتاحة
          </h3>
          <Link href="/specialist/requests" className="btn btn-soft btn-sm">
            عرض الكل
          </Link>
        </div>
        {latest.items.length === 0 ? (
          <div className="card">
            <EmptyState message="لا توجد طلبات متاحة حالياً. سيصلك إشعار عند نشر طلب في منطقتك." />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {latest.items.slice(0, 4).map((request) => (
              <li key={request.id}>
                <RequestCard request={request} href={`/specialist/requests/${request.id}`} viewer="spec" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
