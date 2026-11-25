import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { isUuid } from '@/lib/utils/ids';
import { transitionAccountReview } from '@/repositories/profiles';

/** POST /api/admin/accounts/reject { collection, id, reason } — admin only; pending → rejected (audited). */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const body = await readJson(request);
    const collection = body?.collection;
    const id = asString(body?.id, 64);
    const reason = asString(body?.reason, 1000);
    if ((collection !== 'specialists' && collection !== 'organizations') || !isUuid(id) || !reason) {
      return jsonError('بيانات غير صالحة.', 400);
    }
    const result = await transitionAccountReview(collection, id, 'reject', admin.id, reason);
    if (result === 'not_found') return jsonError('الحساب غير موجود.', 404);
    if (result === 'invalid_state') return jsonError('يمكن رفض الحسابات قيد المراجعة فقط.', 409);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'admin:reject');
  }
}
