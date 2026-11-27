import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { entryPathFor } from '@/lib/auth/access';
import { getAccountFromRequest } from '@/lib/auth/policies';

/**
 * GET /api/session — the server's authoritative answer about who is signed in:
 * the user, both possible profiles, the active context and where the account
 * should land (`entryPath`). The browser never decides its own identity.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const account = await getAccountFromRequest(request);
    if (!account) return jsonOk({ authenticated: false, user: null, specialist: null, organization: null });
    return jsonOk({
      authenticated: true,
      user: { id: account.user.id, email: account.user.email, name: account.user.name, role: account.user.role },
      specialist: account.specialist,
      organization: account.organization,
      activeRole: account.activeRole,
      entryPath: entryPathFor(account.facts, account.activeRole),
    });
  } catch (error) {
    return mapError(error, 'session');
  }
}
