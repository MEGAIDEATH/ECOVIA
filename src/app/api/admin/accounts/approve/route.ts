import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError, readJson } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { approveAccount, type AdminTarget } from '@/repositories/profiles';

/**
 * POST /api/admin/accounts/approve
 * Requires admin session. Approves a specialist or organization account.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin(request);
    const body = await readJson(request);
    if (!body) return jsonError('طلب غير صالح.', 400);

    const target = body.collection as AdminTarget | undefined;
    const id = body.id as string | undefined;

    if (!target || (target !== 'specialists' && target !== 'organizations')) {
      return jsonError('نوع الحساب غير صالح.', 400);
    }
    if (!id || typeof id !== 'string') {
      return jsonError('معرّف الحساب مطلوب.', 400);
    }

    const success = await approveAccount(target, id, admin.id);
    if (!success) {
      return jsonError('الحساب غير موجود.', 404);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return mapError(error, 'admin/accounts/approve');
  }
}
