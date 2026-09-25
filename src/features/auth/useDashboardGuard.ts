'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { getOrganizationById } from '@/features/organizations/organizationRepository';
import { getSpecialistById } from '@/features/specialists/specialistRepository';
import type { Organization, Specialist, UserRole } from '@/types';

import { useAuth } from './AuthProvider';
import { resolveDestination } from './dashboardRouting';
import { getPreferredRole } from './preferredRole';

interface DashboardGuardState {
  ready: boolean;
  /** The profile document for the guarded role (role matches by construction). */
  profile: Specialist | Organization | null;
  /** Re-fetches the profile after edits (no redirects). */
  refresh: () => Promise<void>;
}

/**
 * Protects a dashboard route:
 * - resolves both account documents for the current UID (legacy
 *   `checkAndGoToDashboard` order),
 * - pending → /waiting, wrong role → other dashboard, none → home,
 * - approved + matching role → children render with the loaded profile.
 */
export function useDashboardGuard(requiredRole: UserRole): DashboardGuardState {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Specialist | Organization | null>(null);

  const loadProfile = useCallback(async (): Promise<Specialist | Organization | null> => {
    if (!user) return null;
    return requiredRole === 'spec'
      ? getSpecialistById(user.uid)
      : getOrganizationById(user.uid);
  }, [user, requiredRole]);

  const refresh = useCallback(async () => {
    const next = await loadProfile();
    setProfile(next);
  }, [loadProfile]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      showToast('يرجى المحاولة مجدداً', true);
      router.replace('/');
      return;
    }

    let active = true;

    (async () => {
      try {
        const [specialist, organization] = await Promise.all([
          getSpecialistById(user.uid),
          getOrganizationById(user.uid),
        ]);

        const destination = resolveDestination(
          getPreferredRole(),
          specialist ? { role: 'spec', status: specialist.status } : null,
          organization ? { role: 'org', status: organization.status } : null,
        );

        if (!active) return;

        if (destination.type === 'none') {
          showToast('لم يتم العثور على حساب مسجل', true);
          router.replace('/');
          return;
        }
        if (destination.type === 'waiting') {
          router.replace(`/waiting?role=${destination.role}`);
          return;
        }
        if (destination.role !== requiredRole) {
          router.replace(destination.role === 'spec' ? '/specialist' : '/organization');
          return;
        }

        setProfile(requiredRole === 'spec' ? specialist : organization);
        setReady(true);
      } catch (error) {
        console.error('[dashboard-guard] failed:', error);
        if (active) {
          showToast('خطأ في الاتصال', true);
          router.replace('/');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, user, requiredRole, showToast, router]);

  return { ready, profile, refresh };
}