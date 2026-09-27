import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { buildStorageKey, getStorage } from '@/lib/storage';
import { createDocument, type DocumentKind } from '@/repositories/documents';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

/**
 * POST /api/files — uploads a file to protected server storage and records metadata in DB.
 * Form data: { file, kind }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = formData.get('kind') as DocumentKind | null;

    if (!file || !(file instanceof File)) {
      return jsonError('الملف مطلوب.', 400);
    }
    if (!kind) {
      return jsonError('نوع المستند مطلوب.', 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return jsonError('حجم الملف يتجاوز الحد المسموح به (15 ميجابايت).', 400);
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError('صيغة الملف غير مدعومة.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const storageKey = buildStorageKey(user.id, kind, ext);

    const storage = getStorage();
    await storage.put(storageKey, buffer, file.type);

    const doc = await createDocument({
      ownerUserId: user.id,
      kind,
      storageKey,
      contentType: file.type,
      sizeBytes: file.size,
      originalName: file.name,
    });

    return jsonOk({
      id: doc.id,
      url: `/api/files/${doc.id}`,
    });
  } catch (error) {
    return mapError(error, 'files:upload');
  }
}
