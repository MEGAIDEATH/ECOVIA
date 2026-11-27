import 'server-only';

import type { ClientSession } from '@/features/auth/AuthProvider';

import type { CurrentAccount } from './policies';

/** The minimum session data client islands need (the user's own profiles only). */
export function toClientSession(account: CurrentAccount): ClientSession {
  return {
    user: { id: account.user.id, email: account.user.email, name: account.user.name, role: account.user.role },
    specialist: account.specialist,
    organization: account.organization,
  };
}
