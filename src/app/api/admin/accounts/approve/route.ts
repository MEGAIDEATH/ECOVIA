import type { NextRequest } from 'next/server';

import { isAdminAuthenticated, jsonError } from '@/lib/admin/apiAuth';
import { FirebaseAdminConfigError, getAdminDb } from '@/lib/firebase/admin';
import { organizationCollectionPath, specialistCollectionPath } from '@/lib/firestore/paths';

const ALLOWED_COLLECTIONS: Record<string, string> = {
  specialists: specialistCollectionPath,
  organizations: organizationCollectionPath,
};

/**
 * POST /api/admin/accounts/approve — sets a pending account to `approved`.
 * The collection name is whitelisted server-side; requires an admin session.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isAdminAuthenticated(request)) {
    return jsonError('غير مصرح بالوصول.', 401);
  }

  let target: unknown;
  let id: unknown;
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object') {
      target = (body as { collection?: unknown }).collection;
      id = (body as { id?: unknown }).id;
    }
  } catch {
    return jsonError('طلب غير صالح.', 400);
  }

  if (typeof target !== 'string' || !(target in ALLOWED_COLLECTIONS)) {
    return jsonError('طلب غير صالح.', 400);
  }
  if (typeof id !== 'string' || id.length === 0 || id.length > 128) {
    return jsonError('طلب غير صالح.', 400);
  }

  try {
    const db = getAdminDb();
    await db.doc(`${ALLOWED_COLLECTIONS[target]}/${id}`).update({ status: 'approved' });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof FirebaseAdminConfigError) {
      console.error('[admin/approve] admin credentials are not configured.');
      return jsonError('خدمة البيانات غير مهيأة حالياً.', 503);
    }
    console.error('[admin/approve] update failed:', error);
    return jsonError('تعذر تحديث الحساب، حاول مرة أخرى.', 500);
  }
}
