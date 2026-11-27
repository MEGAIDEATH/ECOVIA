import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/ui/ActionForm';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ContractPanel } from '@/features/contracts/ContractPanel';
import { attachmentsFor } from '@/features/documents/attachments';
import { OfferForm } from '@/features/marketplace/OfferForm';
import { RequestDetails } from '@/features/marketplace/RequestDetails';
import { FacilityCard } from '@/features/organizations/profile/FacilityCard';
import { requireWorkspacePage } from '@/lib/auth/policies';
import { loadRequestForViewer } from '@/lib/auth/recordAccess';
import { formatDateAr } from '@/lib/format';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import { OFFER_BLOCK_MESSAGES, SPECIALIST_PROGRESS, isActiveOffer, offerBlockReason } from '@/lib/marketplace/rules';
import { requestTitle } from '@/lib/serviceTypes';
import { OFFER_STATUS } from '@/lib/status';
import { chatIdsForPairs } from '@/repositories/chat';
import { haveRelationship } from '@/repositories/documents';
import { listContractsForRequest } from '@/repositories/marketplace';
import { getOrganizationById } from '@/repositories/profiles';
import { getRequestWithFacts } from '@/repositories/serviceRequests';
import {
  advanceRequestStatusAction,
  declineRequestAction,
  submitOfferAction,
  undoDeclineAction,
  withdrawOfferAction,
} from '@/server/actions/marketplace';

export const metadata: Metadata = { title: 'تفاصيل الطلب' };

/**
 * Specialist request detail: visible only per the visibility rules (private
 * requests: their designated specialist only — others get 404). Shows the
 * facility, the specialist's own offer form, and their contract.
 */
export default async function SpecialistRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const notice = firstParam((await searchParams).notice);
  const { account, profile } = await requireWorkspacePage('spec', 'approved', `/specialist/requests/${id}`);
  const view = await loadRequestForViewer(account, id, 'spec');
  if (!view || view === 'forbidden' || view.as !== 'spec') notFound();
  const { request, ownOffer, declined } = view;

  const [found, organization, allContracts, related] = await Promise.all([
    getRequestWithFacts(request.id),
    getOrganizationById(request.organizationId),
    listContractsForRequest(request.id),
    haveRelationship(request.organizationId, profile.id),
  ]);
  if (!found || !organization) notFound();
  const contracts = allContracts.filter((contract) => contract.specialistId === profile.id);
  const specialist = { id: profile.id, userId: account.user.id, approved: true };
  const blocked = offerBlockReason(found.facts, specialist, ownOffer?.status ?? null);
  const declinedByFacility = ownOffer?.status === 'declined';
  const canOffer = !blocked && !declinedByFacility && !declined;
  const nextStep = request.specialistId === profile.id ? SPECIALIST_PROGRESS[request.status] : undefined;
  const chatId = related
    ? (await chatIdsForPairs([{ organizationId: organization.id, specialistId: profile.id }])).get(`${organization.id}:${profile.id}`)
    : undefined;
  const registrationAttachments = related ? await attachmentsFor([{ id: organization.crDocId, label: 'السجل التجاري' }]) : [];

  return (
    <div className="fade-up space-y-6">
      <PageHeader
        title={requestTitle(request)}
        back={{ href: '/specialist/requests', label: 'طلبات الخدمة' }}
        actions={
          chatId && (
            <Link href={`/specialist/messages?chat=${encodeURIComponent(chatId)}`} className="btn btn-secondary">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                forum
              </span>
              مراسلة المنشأة
            </Link>
          )
        }
      />

      <NoticeBanner notice={notice} />
      {request.visibility === 'private' && (
        <p role="note" className="alert alert-info">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            lock
          </span>
          طلب خاص موجّه إليك وحدك من {request.organizationName}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RequestDetails request={request} viewer="spec" />
          <ContractPanel contracts={contracts} viewer="spec" requestId={request.id} />

          <section aria-labelledby="offer-heading" className="card space-y-4 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="offer-heading" className="text-lg font-bold text-forest">
                عرضك
              </h3>
              {ownOffer && (
                <StatusBadge tone={OFFER_STATUS[ownOffer.status].tone}>{OFFER_STATUS[ownOffer.status].label}</StatusBadge>
              )}
            </div>
            {ownOffer && (
              <p className="text-sm text-muted">
                آخر تحديث: {formatDateAr(ownOffer.updatedAt)} — مدة التنفيذ المقترحة: <strong className="text-on-surface">{ownOffer.durationLabel}</strong>
              </p>
            )}
            {canOffer ? (
              <OfferForm
                action={submitOfferAction}
                requestId={request.id}
                existing={
                  ownOffer && ownOffer.status === 'submitted'
                    ? { durationValue: ownOffer.durationValue, durationUnit: ownOffer.durationUnit, message: ownOffer.message ?? null }
                    : null
                }
              />
            ) : (
              <p className="text-sm text-on-surface-variant">
                {declined
                  ? 'اعتذرت عن هذا الطلب. أعده إلى قائمتك لتقديم عرض.'
                  : declinedByFacility
                    ? 'اعتذرت المنشأة عن عرضك على هذا الطلب.'
                    : blocked === 'contract_pending'
                      ? 'اختارت المنشأة عرضك — راجع العقد أعلاه ووقّعه.'
                      : blocked
                        ? OFFER_BLOCK_MESSAGES[blocked]
                        : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {ownOffer && isActiveOffer(ownOffer.status) && request.status === 'pending' && (
                <ActionForm
                  action={withdrawOfferAction}
                  hidden={{ requestId: request.id }}
                  label="سحب العرض"
                  buttonClassName="btn btn-danger-outline btn-sm"
                  confirm={{
                    title: 'سحب العرض',
                    body:
                      ownOffer.status === 'selected'
                        ? 'العقد المعدّ لعرضك سيُلغى أيضاً. هل تريد المتابعة؟'
                        : 'سيُسحب عرضك من قائمة عروض المنشأة. يمكنك التقديم مجدداً ما دام الطلب مفتوحاً.',
                    confirmLabel: 'تأكيد السحب',
                    icon: 'undo',
                    danger: true,
                  }}
                />
              )}
              {request.status === 'pending' && !declined && !(ownOffer && isActiveOffer(ownOffer.status)) && (
                <ActionForm
                  action={declineRequestAction}
                  hidden={{ requestId: request.id }}
                  label="غير مناسب لي"
                  buttonClassName="btn btn-ghost btn-sm"
                  confirm={{
                    title: 'الاعتذار عن الطلب',
                    body: 'سيختفي الطلب من قائمة الطلبات المتاحة لك، ويبقى متاحاً لبقية الأخصائيين.',
                    confirmLabel: 'تأكيد الاعتذار',
                    icon: 'do_not_disturb_on',
                  }}
                >
                  <label htmlFor="decline-reason" className="field-label">
                    سبب الاعتذار
                  </label>
                  <textarea id="decline-reason" name="reason" rows={3} maxLength={1000} required className="field-input" />
                </ActionForm>
              )}
              {declined && request.status === 'pending' && (
                <ActionForm action={undoDeclineAction} hidden={{ requestId: request.id }} label="إعادة الطلب إلى قائمتي" buttonClassName="btn btn-soft btn-sm" />
              )}
              {nextStep && (
                <ActionForm
                  action={advanceRequestStatusAction}
                  hidden={{ requestId: request.id, status: nextStep }}
                  label={nextStep === 'in_progress' ? 'بدء تنفيذ الخدمة' : 'إنهاء الخدمة'}
                  buttonClassName="btn btn-primary btn-sm"
                />
              )}
            </div>
          </section>
        </div>

        <FacilityCard
          organization={organization}
          registration={{ visible: related, attachments: registrationAttachments }}
        />
      </div>
    </div>
  );
}
