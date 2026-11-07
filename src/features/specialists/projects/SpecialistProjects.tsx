'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { getApplicationsForSpecialist } from '@/features/applications/applicationRepository';
import type { Application } from '@/types';

export function SpecialistProjects() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getApplicationsForSpecialist()
      .then((list) => { if (active) setApplications(list); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6 fade-up">
      <h2 className="text-xl font-bold text-primary">المشاريع</h2>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg">
        ملاحظة: بيانات المشاريع مستمدة من التقديمات (submitted). حالات &quot;مكتمل&quot; غير مدعومة في الخادم حالياً.
      </div>
      {loading && <LoadingState message="جاري التحميل..." />}
      {error && !loading && <ErrorState />}
      {!loading && !error && applications.length === 0 && (
        <EmptyState message="لا توجد مشاريع" />
      )}
      {!loading && !error && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/specialist/projects/${app.id}`}
              className="block bg-white rounded-2xl border p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">{app.organizationName || 'منشأة'}</p>
                  <p className="text-xs text-secondary mt-1">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString('ar-SA') : ''}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  قيد التنفيذ
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
