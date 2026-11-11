'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import { AuthShell } from '@/components/layout/AuthShell';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { resolveDestination } from '@/features/auth/dashboardRouting';
import { getPreferredRole } from '@/features/auth/preferredRole';
import { useApprovalListener } from '@/features/auth/useApprovalListener';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePerformLogout } from '@/features/auth/usePerformLogout';
import { getOwnOrganization } from '@/features/organizations/organizationRepository';
import { getOwnSpecialist } from '@/features/specialists/specialistRepository';
import type { UserRole } from '@/types';

const AdminLoginModal = dynamic(
  () => import('@/components/modals/AdminLoginModal').then((module) => module.AdminLoginModal),
  { ssr: false },
);

function parseRole(value: string | null): UserRole | null {
  return value === 'spec' || value === 'org' ? value : null;
}

/**
 * Waiting room (legacy `view-waiting-room`): shows the review notice while
 * listening to the user's own document; on approval it toasts the legacy
 * confirmation and enters the matching dashboard after 1.5s.
 */
function WaitingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const performLogout = usePerformLogout();
  const { user, loading } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(() => parseRole(searchParams.get('role')));
  // window.setTimeout returns a DOM number (not NodeJS.Timeout) — typed explicitly.
  const redirectTimerRef = useRef<number | null>(null);

  // Arriving without ?role= → resolve the account exactly like the dashboard entry.
  useEffect(() => {
    if (role || loading || !user) return;
    let active = true;

    (async () => {
      try {
        const [specialist, organization] = await Promise.all([
          getOwnSpecialist(),
          getOwnOrganization(),
        ]);
        const destination = resolveDestination(
          getPreferredRole(),
          specialist ? { role: 'spec', status: specialist.status } : null,
          organization ? { role: 'org', status: organization.status } : null,
        );
        if (!active) return;

        if (destination.type === 'none') {
          router.replace('/');
        } else if (destination.type === 'dashboard') {
          router.replace(destination.role === 'spec' ? '/specialist' : '/organization');
        } else {
          setRole(destination.role);
        }
      } catch (error) {
        console.error('[waiting] failed to resolve account:', error);
        if (active) {
          showToast('خطأ في الاتصال', true);
          router.replace('/');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, loading, user, router, showToast]);

  const handleApproved = useCallback(() => {
    showToast('تم الاعتماد! جاري الدخول...');
    redirectTimerRef.current = window.setTimeout(() => {
      router.replace(role === 'spec' ? '/specialist' : '/organization');
    }, 1500);
  }, [showToast, router, role]);

  useApprovalListener(user?.id ?? null, role, handleApproved);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  if (loading || (!role && !user && !loading)) return <FullPageSpinner />;

  return (
    <AuthShell
      title="جاري التحقق من الاعتماد"
      subtitle="حسابك قيد المراجعة حالياً من قبل الإدارة لمطابقة التراخيص والسجلات."
      icon="pending_actions"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="alert alert-info w-full text-start">
          <Spinner className="mt-0.5 size-5 shrink-0 border-2" />
          <p>سيتم تفعيل الحساب فور الاعتماد، وسيتم تحويلك تلقائياً عند الموافقة.</p>
        </div>
        <button type="button" onClick={performLogout} className="btn btn-danger-outline">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            logout
          </span>
          تسجيل خروج مؤقت
        </button>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="text-xs text-muted underline-offset-4 hover:text-primary hover:underline"
        >
          [تجربة: الدخول كمدير للاعتماد]
        </button>
      </div>

      {adminOpen && <AdminLoginModal open onClose={() => setAdminOpen(false)} />}
    </AuthShell>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <WaitingContent />
    </Suspense>
  );
}
