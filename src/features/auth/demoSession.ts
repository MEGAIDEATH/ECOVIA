import { signOut } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';

import { clearPreferredRole } from './preferredRole';

/**
 * Demo-only session reset: signs the anonymous user out, clears local demo
 * state (the stored preferred role), then navigates to `/` so the normal auth
 * bootstrap creates a brand-new anonymous UID for repeated manual testing.
 *
 * It NEVER deletes Firestore documents, Firebase users, or bypasses security
 * rules — the previously registered account stays untouched under its old UID.
 *
 * `navigate` is injectable purely so unit tests can observe the redirect
 * without triggering a jsdom navigation.
 */
export async function startFreshDemoSession(
  navigate: (href: string) => void = (href) => {
    window.location.assign(href);
  },
): Promise<void> {
  await signOut(getFirebaseAuth());
  clearPreferredRole();
  navigate('/');
}