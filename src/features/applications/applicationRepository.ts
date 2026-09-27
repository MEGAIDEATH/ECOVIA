import type { Application } from '@/types';

export interface CreateApplicationInput {
  /** Target organization profile id (`organizations.id`). Everything else is
   * resolved server-side from the caller's session. */
  organizationId: string;
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId: input.organizationId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر التقديم للوظيفة.');
  }
  return res.json();
}

/** Application history for the signed-in specialist (session-resolved). */
export async function getApplicationsForSpecialist(): Promise<Application[]> {
  const res = await fetch('/api/applications');
  if (!res.ok) return [];
  return res.json();
}
