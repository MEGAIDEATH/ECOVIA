import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { consumeRateLimit, RateLimitError } from '@/lib/auth/rateLimit';
import { requireUser } from '@/lib/auth/session';
import { buildStorageKey, getStorage } from '@/lib/storage';
import {
  isUploadKind,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  validateUpload,
} from '@/lib/storage/validation';
import { createDocument } from '@/repositories/documents';

/** 30 uploads per user per 15 minutes (DB-backed fixed window). */
const UPLOAD_RATE_LIMIT = { scope: 'upload-user', max: 30, windowSeconds: 15 * 60 };

/**
 * POST /api/files — uploads a file to protected object storage and records its
 * metadata (object key, detected type, size, owner) in PostgreSQL.
 * Form data: { file, kind }. Files are only ever read back through the
 * authorized GET /api/files/[id].
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Any signed-in account (pending ones upload their CV / logo too).
    const user = await requireUser(request);
    if (!(await consumeRateLimit(UPLOAD_RATE_LIMIT, user.id))) throw new RateLimitError();
    const formData = await request.formData();
    const file = formData.get('file');
    const kind = formData.get('kind');

    if (!file || !(file instanceof File)) {
      return jsonError('الملف مطلوب.', 400);
    }
    if (!isUploadKind(kind)) {
      return jsonError('نوع المستند غير صالح.', 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError(`حجم الملف يتجاوز الحد المسموح به (${MAX_UPLOAD_LABEL}).`, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const check = validateUpload(kind, buffer);
    if (!check.ok) return jsonError(check.message, 400);

    const storageKey = buildStorageKey(user.id, kind, check.extension);
    const storage = getStorage();
    await storage.put(storageKey, buffer, check.type);

    let doc;
    try {
      doc = await createDocument({
        ownerUserId: user.id,
        kind,
        storageKey,
        contentType: check.type,
        sizeBytes: buffer.length,
        originalName: file.name.slice(0, 255),
      });
    } catch (error) {
      // Do not leave an orphaned object when the metadata row fails.
      await storage.delete(storageKey).catch(() => undefined);
      throw error;
    }

    return jsonOk({
      id: doc.id,
      url: `/api/files/${doc.id}`,
    });
  } catch (error) {
    return mapError(error, 'files:upload');
  }
}
