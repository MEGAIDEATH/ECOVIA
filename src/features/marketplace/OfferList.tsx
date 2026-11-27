import Link from 'next/link';

import { ActionForm } from '@/components/ui/ActionForm';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateAr } from '@/lib/format';
import { OFFER_STATUS } from '@/lib/status';
import { declineOfferAction, prepareContractAction } from '@/server/actions/marketplace';
import type { Offer } from '@/types';

import { PrepareContractDialog } from './PrepareContractDialog';

/**
 * Facility view: every offer on its request, side by side (selected first),
 * with the duration each specialist needs. Selecting = preparing a contract;
 * the request stays open until the specialist signs.
 */
export function OfferList({
  offers,
  requestId,
  requestTitle,
  requestOpen,
  hasPendingContract,
  chatIds,
}: {
  offers: Offer[];
  requestId: string;
  requestTitle: string;
  requestOpen: boolean;
  hasPendingContract: boolean;
  chatIds: Map<string, string>;
}) {
  if (offers.length === 0) {
    return (
      <div className="card">
        <EmptyState
          message={
            requestOpen
              ? 'لم تصل عروض بعد. سيصلك إشعار عند تقديم أي أخصائي لعرضه.'
              : 'لم يقدّم أي أخصائي عرضاً على هذا الطلب.'
          }
        />
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {offers.map((offer) => {
        const status = OFFER_STATUS[offer.status];
        const chatId = chatIds.get(offer.specialistId);
        return (
          <li key={offer.id} className="card flex flex-col gap-3 p-4 md:p-5" data-testid="offer-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/organization/specialists/${offer.specialistId}`}
                  className="font-bold text-forest no-underline hover:text-secondary"
                >
                  {offer.specialistName}
                </Link>
                <p className="truncate text-xs text-muted">
                  {[offer.specialistEdu || 'لم يحدد التخصص', offer.specialistRegion, offer.specialistYears && `${offer.specialistYears} سنوات خبرة`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-control bg-wash px-3 py-2">
                <dt className="text-[11px] font-semibold text-muted">مدة التنفيذ</dt>
                <dd className="font-bold text-on-surface">{offer.durationLabel}</dd>
              </div>
              <div className="rounded-control bg-wash px-3 py-2">
                <dt className="text-[11px] font-semibold text-muted">تاريخ العرض</dt>
                <dd className="font-bold text-on-surface">{formatDateAr(offer.updatedAt)}</dd>
              </div>
            </dl>
            {offer.message && (
              <p className="rounded-control border border-line bg-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                {offer.message}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-start gap-2">
              {requestOpen && offer.status === 'submitted' && !hasPendingContract && (
                <PrepareContractDialog
                  action={prepareContractAction}
                  offerId={offer.id}
                  requestId={requestId}
                  specialistName={offer.specialistName}
                  defaultTitle={requestTitle}
                  durationLabel={offer.durationLabel}
                />
              )}
              {requestOpen && offer.status === 'submitted' && (
                <ActionForm
                  action={declineOfferAction}
                  hidden={{ offerId: offer.id, requestId }}
                  label="اعتذار عن العرض"
                  buttonClassName="btn btn-ghost btn-sm"
                  confirm={{
                    title: 'الاعتذار عن العرض',
                    body: `سيُبلَّغ ${offer.specialistName} بأن عرضه لم يُقبل، ويبقى طلبك مفتوحاً لبقية العروض.`,
                    confirmLabel: 'تأكيد الاعتذار',
                    icon: 'do_not_disturb_on',
                    danger: true,
                  }}
                />
              )}
              <Link href={`/organization/specialists/${offer.specialistId}`} className="btn btn-secondary btn-sm">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  badge
                </span>
                السيرة الذاتية
              </Link>
              {chatId && (
                <Link href={`/organization/messages?chat=${encodeURIComponent(chatId)}`} className="btn btn-secondary btn-sm">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    forum
                  </span>
                  مراسلة
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
