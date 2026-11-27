/**
 * Resets the demo session: signs out on the server (session row deleted,
 * cookies expired, active-context cookie cleared), then returns home.
 */
export async function startFreshDemoSession(
  navigate: (href: string) => void = (href) => {
    window.location.assign(href);
  },
): Promise<void> {
  await fetch('/api/session/logout', { method: 'POST' }).catch(() => null);
  navigate('/');
}
