import 'server-only';

import type { DocumentMeta } from '@/repositories/documents';
import { getDocumentMetas } from '@/repositories/documents';

import type { Attachment } from './AttachmentList';

/** Builds labelled attachments from document ids (missing/deleted ids are skipped). */
export async function attachmentsFor(items: Array<{ id: string | null | undefined; label: string }>): Promise<Attachment[]> {
  const metas = await getDocumentMetas(items.map((item) => item.id));
  return items.flatMap((item) => {
    const meta: DocumentMeta | undefined = item.id ? metas.get(item.id) : undefined;
    return meta
      ? [{ id: meta.id, label: item.label, contentType: meta.contentType, sizeBytes: meta.sizeBytes, createdAt: meta.createdAt }]
      : [];
  });
}
