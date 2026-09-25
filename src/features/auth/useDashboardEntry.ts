'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { getOrganizationById } from '@/features/organizations/organizationRepository';
import { getSpecialistById } from '@/features/specialists/specialistRepository';

import { useAuth } from './AuthProvider';
import { resolveDestination } from './dashboardRouting';
import { getPreferredRole } from './preferredRole';

/**
 * Port of the legacy `checkAndGoToDashboard()`: inspects both account
 * documents for the current UID, applies the preferred-role order, then
 * routes to the dashboard (approved) or the waiting room (pending).
 */
export function useDashboardEntry() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const checkAndGoToDashboard = useCallback(async () => {
    if (!user) {
      showToast('يرجى المحاولة مجدداً', true);
      return;
    }

    setChecking(true);
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

      if (destination.type === 'none') {
        showToast('لم يتم العثور على حساب مسجل', true);
        return;
      }

      const base = destination.role === 'spec' ? '/specialist' : '/organization';
      router.replace(
        destination.type === 'dashboard' ? base : `/waiting?role=${destination.role}`,
      );
    } catch (error) {
      console.error('[dashboard-entry] failed:', error);
      showToast('خطأ في الاتصال', true);
    } finally {
      setChecking(false);
    }
  }, [user, showToast, router]);

  return { checkAndGoToDashboard, checking };
}