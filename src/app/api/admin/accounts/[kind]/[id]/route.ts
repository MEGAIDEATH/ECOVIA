import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { getDocumentMetas } from '@/repositories/documents';
import { getOrganizationById, getSpecialistById, listReviewHistory } from '@/repositories/profiles';

/**
 * GET /api/admin/accounts/[kind]/[id] — admin only: the full registration
 * record of one account, its attachments (metadata; files via /api/files/[id],
 * which allows admins) and its review history (approvals, rejections with
 * reasons, resubmissions, reopenings).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }): Promise<Response> {
  try {
    await requireAdmin(request);
    const { kind, id } = await params;
    if (kind !== 'specialists' && kind !== 'organizations') return jsonError('نوع الحساب غير صالح.', 400);
    const profile = kind === 'specialists' ? await getSpecialistById(id) : await getOrganizationById(id);
    if (!profile) return jsonError('الحساب غير موجود.', 404);
    const documentIds =
      'license' in profile
        ? [
            { id: profile.licenseDocId, label: 'الترخيص المهني' },
            { id: profile.resumeFileId, label: 'ملف السيرة الذاتية' },
            { id: profile.profilePicId, label: 'الصورة الشخصية' },
          ]
        : [
            { id: profile.crDocId, label: 'السجل التجاري' },
            { id: profile.profileImageId, label: 'الشعار' },
          ];
    const metas = await getDocumentMetas(documentIds.map((doc) => doc.id));
    const attachments = documentIds.flatMap((doc) => {
      const meta = doc.id ? metas.get(doc.id) : undefined;
      return meta ? [{ ...meta, label: doc.label }] : [];
    });
    return jsonOk({ kind, profile, attachments, history: await listReviewHistory(kind, id) });
  } catch (error) {
    return mapError(error, 'admin:account-details');
  }
}
