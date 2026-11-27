import { DetailList, type DetailItem } from '@/components/ui/DetailList';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AttachmentList, type Attachment } from '@/features/documents/AttachmentList';
import { ACCOUNT_STATUS, presentStatus } from '@/lib/status';
import type { AccountStatus } from '@/types';

/**
 * The account owner's complete registration record (read-only) with its
 * attachments — available to pending accounts too.
 */
export function RegistrationDetails({
  status,
  items,
  attachments,
  emptyAttachments,
}: {
  status: AccountStatus;
  items: DetailItem[];
  attachments: Attachment[];
  emptyAttachments: string;
}) {
  const presentation = presentStatus(ACCOUNT_STATUS, status);
  return (
    <section aria-labelledby="registration-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="registration-heading" className="text-lg font-bold text-forest">
          بيانات التسجيل والمرفقات
        </h3>
        <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
      </div>
      <DetailList items={items} />
      <div className="card p-5">
        <h4 className="mb-3 text-sm font-bold text-forest">المرفقات</h4>
        <AttachmentList attachments={attachments} empty={emptyAttachments} />
      </div>
    </section>
  );
}
