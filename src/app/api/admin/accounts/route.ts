import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/session';
import { listAccountsForAdmin } from '@/repositories/profiles';

/**
 * GET /api/admin/accounts
 * Lists all specialists and organizations for admin review.
 * Protected: requires admin role.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin(request);
    const accounts = await listAccountsForAdmin();
    return jsonOk(accounts);
  } catch (error) {
    return mapError(error, 'admin/accounts');
  }
}
