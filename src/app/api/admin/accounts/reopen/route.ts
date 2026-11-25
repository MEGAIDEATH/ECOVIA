import type { NextRequest } from 'next/server';

import { asString, jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { isUuid } from '@/lib/utils/ids';
import { transitionAccountReview } from '@/repositories/profiles';

/**
 * POST /api/admin/accounts/reopen { collection, id, note? } — admin only;
 * rejected → pending so the account can be reviewed again. The earlier
 * rejection stays in the audit history; no permission is granted.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const body = await readJson(request);
    const collection = body?.collection;
    const id = asString(body?.id, 64);
    const note = asString(body?.note, 500) ?? undefined;
    if ((collection !== 'specialists' && collection !== 'organizations') || !isUuid(id)) {
      return jsonError('بيانات غير صالحة.', 400);
    }
    const result = await transitionAccountReview(collection, id, 'reopen', admin.id, note);
    if (result === 'not_found') return jsonError('الحساب غير موجود.', 404);
    if (result === 'invalid_state') return jsonError('يمكن إعادة فتح الحسابات المرفوضة فقط.', 409);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'admin:reopen');
  }
}
