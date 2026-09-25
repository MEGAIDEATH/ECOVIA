import { safeStorage } from '@/lib/utils/safeStorage';
import type { UserRole } from '@/types';

const PREFERRED_ROLE_KEY = 'preferredRole';

/** Reads the preferred role stored by registration ("spec" | "org"). */
export function getPreferredRole(): UserRole | null {
  const value = safeStorage.getItem(PREFERRED_ROLE_KEY);
  return value === 'spec' || value === 'org' ? value : null;
}

export function setPreferredRole(role: UserRole): void {
  safeStorage.setItem(PREFERRED_ROLE_KEY, role);
}

/** Cleared on logout (legacy `performLogout`). */
export function clearPreferredRole(): void {
  safeStorage.removeItem(PREFERRED_ROLE_KEY);
}