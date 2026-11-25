import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { BrandMark } from '@/components/brand/BrandMark';
import { ActionForm } from '@/components/ui/ActionForm';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { PrintButton } from '@/components/ui/PrintButton';
import { ContractDocumentView } from '@/features/contracts/ContractDocumentView';
import { SignContractForm } from '@/features/contracts/SignContractForm';
import { entryPathFor } from '@/lib/auth/access';
import { getCurrentAccount } from '@/lib/auth/policies';
import { requireRecordAccess } from '@/lib/auth/recordAccess';
import { ForbiddenError, NotFoundError } from '@/lib/auth/session';
import { firstParam, type SearchParams } from '@/lib/searchParams';
import type { ContractDocument } from '@/repositories/contracts';
import { signContractAction, withdrawContractAction } from '@/server/actions/marketplace';

export const metadata: Metadata = { title: 'العقد', robots: { index: false } };

/**
 * /contracts/[id] — the contract document for its two parties (approved) or
 * an administrator. Anyone else gets "not found"; unapproved accounts are sent
 * to their own CV / facility profile.
 */
export default async function ContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const notice = firstParam((await searchParams).notice);
  const account = await getCurrentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(`/contracts/${id}`)}`);

  let contract: ContractDocument;
  try {
    contract = await requireRecordAccess(account, { kind: 'contract', id });
  } catch (error) {
    if (error instanceof ForbiddenError) redirect(entryPathFor(account.facts, account.activeRole));
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const backHref = contract.request
    ? contract.viewerRole === 'spec'
      ? `/specialist/requests/${contract.request.id}`
      : contract.viewerRole === 'org'
        ? `/organization/requests/${contract.request.id}`
        : '/admin'
    : contract.viewerRole === 'spec'
      ? '/specialist/messages'
      : contract.viewerRole === 'org'
        ? '/organization/messages'
        : '/admin';

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-forest/10 bg-white/95 print-hidden">
        <div className="container-brand flex min-h-[64px] items-center justify-between gap-3">
          <BrandMark href="/dashboard" size="sm" />
          <div className="flex gap-2">
            <Link href={backHref} className="btn btn-ghost">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
              رجوع
            </Link>
            <PrintButton targetId="contract-document" label="طباعة العقد" />
          </div>
        </div>
      </header>
      <main className="container-brand max-w-4xl space-y-6 py-8">
        <NoticeBanner notice={notice} />
        <ContractDocumentView contract={contract} id="contract-document" />
        {contract.status === 'pending' && contract.viewerRole === 'spec' && (
          <section aria-labelledby="sign-heading" className="card p-5 md:p-6">
            <h2 id="sign-heading" className="mb-3 text-lg font-bold text-forest">
              توقيع العقد
            </h2>
            <SignContractForm action={signContractAction} contractId={contract.id} />
          </section>
        )}
        {contract.status === 'pending' && contract.viewerRole === 'org' && (
          <ActionForm
            action={withdrawContractAction}
            hidden={{ contractId: contract.id, requestId: contract.request?.id ?? '' }}
            label="سحب العقد قبل التوقيع"
            buttonClassName="btn btn-danger-outline"
            confirm={{
              title: 'سحب العقد',
              body: 'سيُلغى العقد قبل توقيعه، ويعود العرض إلى قائمة العروض المقدَّمة.',
              confirmLabel: 'تأكيد السحب',
              icon: 'undo',
              danger: true,
            }}
          />
        )}
      </main>
    </div>
  );
}
