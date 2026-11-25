import { formatDateAr, formatFileSize } from '@/lib/format';

import { AttachmentItem } from './AttachmentItem';

export interface Attachment {
  id: string;
  label: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

const VIEWABLE = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function typeLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType.startsWith('image/')) return 'صورة';
  return contentType;
}

/**
 * Registration attachments (permit, commercial registration, CV file…):
 * label, type, size and upload date, with an inline viewer. Files are fetched
 * through the authorized /api/files route — never a public URL.
 */
export function AttachmentList({ attachments, empty }: { attachments: Attachment[]; empty: string }) {
  if (attachments.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          id={attachment.id}
          label={attachment.label}
          viewable={VIEWABLE.has(attachment.contentType)}
          details={`${typeLabel(attachment.contentType)} · ${formatFileSize(attachment.sizeBytes)} · رُفع في ${formatDateAr(attachment.createdAt)}`}
        />
      ))}
    </ul>
  );
}
