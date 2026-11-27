import 'server-only';

import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { approvedIds } from '@/lib/auth/recordAccess';
import { ForbiddenError } from '@/lib/auth/session';
import type { ChatActor } from '@/repositories/chat';

/**
 * The chat actor for a request: the session user plus their APPROVED profile
 * ids. Chat is an approved-only feature — pending accounts get 403.
 */
export async function requireChatActor(request: Request): Promise<ChatActor> {
  const account = await requireAuthenticatedUser(request);
  const ids = approvedIds(account);
  if (!ids.approvedOrganizationId && !ids.approvedSpecialistId) {
    throw new ForbiddenError('المراسلات متاحة بعد اعتماد الحساب.');
  }
  return { userId: account.user.id, ...ids };
}
