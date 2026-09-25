'use client';

import { useEffect, useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import {
  createApplication,
  getApplicationsForSpecialist,
} from '@/features/applications/applicationRepository';
import { useAuth } from '@/features/auth/AuthProvider';
import { getApprovedOrganizations } from '@/features/organizations/organizationRepository';
import type { Application, OrganizationDirectoryEntry } from '@/types';

/** Specialist tab: approved-organization directory + application history. */
export function SpecialistOrganizations() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [organizations, setOrganizations] = useState<OrganizationDirectoryEntry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [error, setError] = useState(false);
  const [submittingTo, setSubmittingTo] = useState<string | null>(null);
  const [appliedOrgIds, setAppliedOrgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    getApprovedOrganizations()
      .then((list) => {
        if (active) setOrganizations(list.filter((org) => org.id !== user?.uid));
      })
      .catch((err: unknown) => {
        console.error('[organizations] load failed:', err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoadingOrgs(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    getApplicationsForSpecialist(user.uid)
      .then((list) => {
        if (!active) return;
        setApplications(list);
        setAppliedOrgIds(new Set(list.map((application) => application.organizationId)));
      })
      .catch((err: unknown) => {
        console.error('[applications] load failed:', err);
      })
      .finally(() => {
        if (active) setLoadingApps(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const submitApplication = async (org: OrganizationDirectoryEntry) => {
    if (!user || submittingTo) return;
    setSubmittingTo(org.id);
    try {
      await createApplication({
        specialistId: user.uid,
        organizationId: org.id,
        organizationName: org.orgName,
        chatId: `chat_${org.id}_${user.uid}`,
      });
      showToast(`تم التقديم بنجاح إلى ${org.orgName}`);
      setAppliedOrgIds((previous) => new Set(previous).add(org.id));
      setApplications(await getApplicationsForSpecialist(user.uid));
    } catch (submitError) {
      console.error('[applications] submit failed:', submitError);
      showToast('حدث خطأ', true);
    } finally {
      setSubmittingTo(null);
    }
  };

  return (
    <div className="fade-up">
      <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-6 mb-6">
        <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">corporate_fare</span> دليل المنشآت المعتمدة
        </h3>
        <p className="text-sm text-secondary mb-6 leading-relaxed">
          استعرض الجهات والشركات البيئية المعتمدة في المنصة وقدم سيرتك الذاتية لها مباشرة لبناء
          شراكات جديدة.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingOrgs && (
            <LoadingState
              message="جاري تحميل المنشآت..."
              className="col-span-full text-center text-secondary py-8"
            />
          )}
          {error && !loadingOrgs && (
            <ErrorState className="col-span-full text-center text-red-500" />
          )}
          {!loadingOrgs && !error && organizations.length === 0 && (
            <EmptyState
              message="لا توجد منشآت معتمدة"
              className="col-span-full text-center text-secondary"
            />
          )}
          {!loadingOrgs &&
            !error &&
            organizations.map((org) => {
              const applied = appliedOrgIds.has(org.id);
              const submitting = submittingTo === org.id;
              return (
                <div key={org.id} className="bg-white p-6 rounded-2xl border flex flex-col shadow-sm">
                  <h4 className="font-bold text-primary mb-4">{org.orgName}</h4>
                  <button
                    type="button"
                    onClick={() => void submitApplication(org)}
                    disabled={applied || submitting}
                    className={`w-full py-2 border-2 border-primary text-primary font-bold rounded-lg transition-colors ${
                      applied
                        ? 'opacity-50 cursor-not-allowed bg-primary/5'
                        : 'hover:bg-primary hover:text-white'
                    } disabled:opacity-60`}
                  >
                    {applied ? 'تم التقديم' : submitting ? 'جاري...' : 'تقديم السيرة'}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 p-6">
        <h3 className="font-bold text-primary mb-4 flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-[18px]">history</span> سجل التقديمات
          السابقة
        </h3>
        <div className="space-y-3">
          {loadingApps && (
            <LoadingState message="جاري التحميل..." className="text-sm text-secondary text-center py-4" />
          )}
          {!loadingApps && applications.length === 0 && (
            <div className="text-sm text-secondary text-center py-4">
              لم تقم بتقديم سيرتك لأي جهة بعد.
            </div>
          )}
          {!loadingApps &&
            applications.map((application) => (
              <div
                key={application.id}
                className="bg-white border border-outline-variant/50 rounded-xl p-4 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">
                    {application.organizationName || 'منشأة'}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {application.createdAt?.toDate
                      ? application.createdAt.toDate().toLocaleDateString('ar-SA')
                      : ''}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  تم التقديم
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
