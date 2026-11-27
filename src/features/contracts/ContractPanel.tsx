import Link from 'next/link';

import { ActionForm } from '@/components/ui/ActionForm';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateAr, formatDateTimeAr } from '@/lib/format';
import { formatCost } from '@/lib/serviceRequests';
import { CONTRACT_STATUS } from '@/lib/status';
import { signContractAction, withdrawContractAction } from '@/server/actions/marketplace';
import type { ContractSummary } from '@/types';

import { SignContractForm } from './SignContractForm';

/**
 * Contracts of one request as seen by a party. The single shared "View
 * contract" action opens /contracts/[id]; drafts are labelled as drafts —
 * never as signed documents.
 */
export function ContractPanel({
  contracts,
  viewer,
  requestId,
}: {
  contracts: ContractSummary[];
  viewer: 'org' | 'spec';
  requestId: string;
}) {
  const visible = contracts.filter((contract) => contract.status !== 'cancelled');
  const cancelledCount = contracts.length - visible.length;
  if (contracts.length === 0) return null;

  return (
    <section aria-labelledby="contracts-heading" className="space-y-3">
      <h3 id="contracts-heading" className="text-lg font-bold text-forest">
        العقد
      </h3>
      {visible.map((contract) => {
        const status = CONTRACT_STATUS[contract.status];
        const numeric = Number(contract.value);
        return (
          <article
            key={contract.id}
            className={`card border-2 p-4 md:p-5 ${contract.status === 'signed' ? 'border-success/40' : 'border-warning/40'}`}
            data-testid="contract-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-forest">{contract.title}</p>
                <p className="text-xs text-muted">
                  أُعدّ في {formatDateAr(contract.createdAt)}
                  {contract.signedAt ? ` · وُقّع في ${formatDateTimeAr(contract.signedAt)}` : ''}
                </p>
              </div>
              <StatusBadge tone={status.tone} icon={contract.status === 'signed' ? 'verified' : 'schedule'}>
                {status.label}
              </StatusBadge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-control bg-wash px-3 py-2">
                <dt className="text-[11px] font-semibold text-muted">القيمة</dt>
                <dd className="font-bold">{Number.isFinite(numeric) ? formatCost(numeric) : contract.value}</dd>
              </div>
              <div className="rounded-control bg-wash px-3 py-2">
                <dt className="text-[11px] font-semibold text-muted">مدة التنفيذ</dt>
                <dd className="font-bold">{contract.duration}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-start gap-2">
              <Link href={`/contracts/${contract.id}`} className="btn btn-secondary btn-sm" data-testid="view-contract">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  description
                </span>
                {contract.status === 'signed' ? 'عرض العقد' : 'عرض مسودة العقد'}
              </Link>
              {viewer === 'org' && contract.status === 'pending' && (
                <ActionForm
                  action={withdrawContractAction}
                  hidden={{ contractId: contract.id, requestId }}
                  label="سحب العقد"
                  buttonClassName="btn btn-danger-outline btn-sm"
                  confirm={{
                    title: 'سحب العقد',
                    body: 'سيُلغى العقد قبل توقيعه، ويعود العرض إلى قائمة العروض المقدَّمة لتتمكن من اختيار عرض آخر.',
                    confirmLabel: 'تأكيد السحب',
                    icon: 'undo',
                    danger: true,
                  }}
                />
              )}
            </div>
            {viewer === 'spec' && contract.status === 'pending' && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-3 text-sm text-on-surface">
                  اختارت المنشأة عرضك وأعدّت هذا العقد. راجع المسودة ثم وقّع لإتمام التعاقد وإغلاق الطلب.
                </p>
                <SignContractForm action={signContractAction} contractId={contract.id} />
              </div>
            )}
          </article>
        );
      })}
      {cancelledCount > 0 && <p className="text-xs text-muted">عقود ملغاة سابقاً لهذا الطلب: {cancelledCount}</p>}
    </section>
  );
}
