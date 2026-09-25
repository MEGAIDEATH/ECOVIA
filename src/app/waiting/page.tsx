'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { resolveDestination } from '@/features/auth/dashboardRouting';
import { getPreferredRole } from '@/features/auth/preferredRole';
import { useApprovalListener } from '@/features/auth/useApprovalListener';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePerformLogout } from '@/features/auth/usePerformLogout';
import { getOrganizationById } from '@/features/organizations/organizationRepository';
import { getSpecialistById } from '@/features/specialists/specialistRepository';
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

  useApprovalListener(user?.uid ?? null, role, handleApproved);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  if (loading || (!role && !user && !loading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner className="w-12 h-12 border-4" />
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen relative p-6 bg-surface items-center justify-center">
      <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-lg border border-outline-variant/30 flex flex-col items-center">
        <Spinner className="w-24 h-24 border-4 mb-6" />
        <h2 className="text-2xl font-bold text-primary mb-3">جاري التحقق من الاعتماد</h2>
        <p className="text-secondary text-sm leading-relaxed mb-6 font-medium bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
          حسابك قيد المراجعة حالياً من قبل الإدارة لمطابقة التراخيص والسجلات.
          <br />
          سيتم تفعيل الحساب فور الاعتماد.
        </p>
        <p className="text-xs text-secondary/70">
          يرجى الانتظار، سيتم تحويلك تلقائياً عند الموافقة...
        </p>

        <button
          type="button"
          onClick={performLogout}
          className="mt-8 text-sm text-red-500 font-bold hover:underline flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span> تسجيل خروج مؤقت
        </button>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="mt-4 text-xs text-primary/40 hover:text-primary transition-colors"
        >
          [تجربة: الدخول كمدير للاعتماد]
        </button>
      </div>

      {adminOpen && (
        <AdminLoginModal open onClose={() => setAdminOpen(false)} />
      )}
    </main>
  );
}

export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <Spinner className="w-12 h-12 border-4" />
        </div>
      }
    >
      <WaitingContent />
    </Suspense>
  );
}