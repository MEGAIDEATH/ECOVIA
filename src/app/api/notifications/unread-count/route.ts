import type { NextRequest } from 'next/server';

import { mapError } from '@/lib/api/http';
import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { approvedIds } from '@/lib/auth/recordAccess';
import { ForbiddenError } from '@/lib/auth/session';
import { countUnreadNotifications } from '@/repositories/notifications';

/**
 * GET /api/notifications/unread-count — the session user's own unread count
 * (used by the navigation bell to refresh while a page stays open).
 * 401 signed out · 403 no approved profile.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const account = await requireAuthenticatedUser(request);
    const ids = approvedIds(account);
    if (!ids.approvedOrganizationId && !ids.approvedSpecialistId) throw new ForbiddenError();
    const count = await countUnreadNotifications(account.user.id);
    return Response.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return mapError(error, 'notifications:unread-count');
  }
}

