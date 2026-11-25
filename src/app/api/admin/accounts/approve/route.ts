import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { isUuid } from '@/lib/utils/ids';
import { transitionAccountReview, type AdminTarget } from '@/repositories/profiles';


/** POST /api/admin/accounts/approve { collection, id } — admin only; pending → approved (audited). */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const body = await readJson(request);
    const target = body?.collection as AdminTarget | undefined;
    const id = body?.id;
    if (target !== 'specialists' && target !== 'organizations') return jsonError('نوع الحساب غير صالح.', 400);
    if (!isUuid(id)) return jsonError('معرّف الحساب مطلوب.', 400);
    const result = await transitionAccountReview(target, id, 'approve', admin.id);
    if (result === 'not_found') return jsonError('الحساب غير موجود.', 404);
    if (result === 'invalid_state') {
      return jsonError('لا يمكن اعتماد هذا الحساب في حالته الحالية (أعد فتح المراجعة أولاً).', 409);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'admin/accounts/approve');
  }
}
