import type { NextRequest } from 'next/server';

import { jsonError, jsonOk, mapError } from '@/lib/api/http';
import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { ForbiddenError } from '@/lib/auth/session';
import { loadRequestForViewer } from '@/lib/auth/recordAccess';

/**
 * GET /api/service-requests/[id] — one request, if the caller may see it:
 * the owning (approved) facility, or an approved specialist allowed by the
 * visibility rules (private requests: only their designated specialist).
 * Unapproved accounts → 403; invisible or unknown ids → 404.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const account = await requireAuthenticatedUser(request);
    const { id } = await params;
    const view = await loadRequestForViewer(account, id);
    if (view === 'forbidden') throw new ForbiddenError();
    if (!view) return jsonError('غير موجود.', 404);
    return jsonOk(view.request);
  } catch (error) {
    return mapError(error, 'service-requests:get-one');
  }
}
