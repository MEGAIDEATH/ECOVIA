import { clearPreferredRole } from './preferredRole';

/**
 * Resets the demo session by calling the logout endpoint and clearing preferred role.
 */
export async function startFreshDemoSession(
  navigate: (href: string) => void = (href) => {
    window.location.assign(href);
  },
): Promise<void> {
  await fetch('/api/session/logout', { method: 'POST' }).catch(() => null);
  clearPreferredRole();
  navigate('/');
}
