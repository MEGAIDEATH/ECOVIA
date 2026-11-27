import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/ui/ActionForm';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { PageHeader } from '@/components/ui/PageHeader';
import { ContractPanel } from '@/features/contracts/ContractPanel';
import { OfferList } from '@/features/marketplace/OfferList';
import { RequestDetails } from '@/features/marketplace/RequestDetails';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { canCancelRequest, isActiveOffer } from '@/lib/marketplace/rules';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { requestTitle } from '@/lib/serviceTypes';
import { chatIdsForPairs } from '@/repositories/chat';
import { listContractsForRequest, listOffersForRequest } from '@/repositories/marketplace';
import { getRequestForOrganization } from '@/repositories/serviceRequests';
import { cancelServiceRequestAction } from '@/server/actions/marketplace';

export const metadata: Metadata = { title: 'تفاصيل الطلب' };

/** Facility request detail: the request, the competing offers, and its contract. */
export default async function OrganizationRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { profile } = await requireWorkspacePage('org', 'approved', `/organization/requests/${id}`);
  const request = await getRequestForOrganization(id, profile.id);
  if (!request) notFound();
  const query = await searchParams;
  const justCreated = firstParam(query.created) === '1';

  const [offers, contracts] = await Promise.all([listOffersForRequest(request.id), listContractsForRequest(request.id)]);
  const pairChats = await chatIdsForPairs(
    offers.map((offer) => ({ organizationId: profile.id, specialistId: offer.specialistId })),
  );
  const chatIds = new Map(offers.map((offer) => [offer.specialistId, pairChats.get(`${profile.id}:${offer.specialistId}`) ?? ''] as const).filter(([, chat]) => chat));
  const open = request.status === 'pending';
  const hasPendingContract = contracts.some((contract) => contract.status === 'pending');
  const activeOffers = offers.filter((offer) => isActiveOffer(offer.status)).length;
  const contractedChat = request.specialistId ? chatIds.get(request.specialistId) : undefined;

  return (
    <div className="fade-up space-y-6">
      <PageHeader
        title={requestTitle(request)}
        back={{ href: '/organization/requests', label: 'طلبات الخدمة' }}
        actions={
          <>
            {contractedChat && (
              <Link href={`/organization/messages?chat=${encodeURIComponent(contractedChat)}`} className="btn btn-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  forum
                </span>
                مراسلة الأخصائي المتعاقد
              </Link>
            )}
            {canCancelRequest(request) && (
              <ActionForm
                action={cancelServiceRequestAction}
                hidden={{ requestId: request.id }}
                label="إلغاء الطلب"
                buttonClassName="btn btn-danger-outline"
                confirm={{
                  title: 'إلغاء الطلب',
                  body: 'سيُغلق الطلب أمام العروض، ويُلغى أي عقد لم يُوقّع بعد، ويُبلَّغ مقدّمو العروض. لا يمكن التراجع عن الإلغاء.',
                  confirmLabel: 'تأكيد الإلغاء',
                  icon: 'block',
                  danger: true,
                }}
              />
            )}
          </>
        }
      />

      <NoticeBanner notice={firstParam(query.notice)} />
      {justCreated && (
        <p role="status" className="alert alert-success">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            check_circle
          </span>
          {request.visibility === 'private'
            ? `تم إرسال الطلب الخاص إلى ${request.targetSpecialistName ?? 'الأخصائي'}.`
            : `تم نشر الطلب وإشعار الأخصائيين المعتمدين في ${request.region}.`}
        </p>
      )}

      <RequestDetails request={request} viewer="org" />

      <ContractPanel contracts={contracts} viewer="org" requestId={request.id} />

      <section aria-labelledby="offers-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="offers-heading" className="text-lg font-bold text-forest">
            العروض <span className="badge badge-neutral ms-1">{offers.length}</span>
          </h3>
          {open && (
            <p className="text-xs text-muted">
              {hasPendingContract
                ? 'يوجد عقد بانتظار توقيع الأخصائي — الطلب ما زال مفتوحاً للعروض حتى التوقيع.'
                : `${activeOffers} عرض نشط — اختر عرضاً لإعداد العقد.`}
            </p>
          )}
        </div>
        <OfferList
          offers={offers}
          requestId={request.id}
          requestTitle={requestTitle(request)}
          requestOpen={open}
          hasPendingContract={hasPendingContract}
          chatIds={chatIds}
        />
      </section>
    </div>
  );
}
