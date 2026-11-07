'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EmptyState, LoadingState } from '@/components/ui/Feedback';
import { getApplicationsForSpecialist } from '@/features/applications/applicationRepository';
import type { Application } from '@/types';

export function SpecialistProjectDetail() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getApplicationsForSpecialist()
      .then((list) => {
        if (active) setApplication(list.find((a) => a.id === params?.id) ?? null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params?.id]);

  if (loading) return <LoadingState message="جاري التحميل..." />;
  if (!application) return <EmptyState message="المشروع غير موجود." />;

  return (
    <div className="space-y-6 fade-up">
      <Link href="/specialist/projects" className="text-primary hover:underline text-sm">← الرجوع</Link>
      <h2 className="text-xl font-bold text-primary">تفاصيل المشروع</h2>
      <div className="bg-white rounded-2xl border p-6 space-y-2 text-sm">
        <p><strong>المنشأة:</strong> {application.organizationName || 'منشأة'}</p>
        <p><strong>الحالة:</strong> قيد التنفيذ</p>
        <p><strong>التاريخ:</strong> {application.createdAt ? new Date(application.createdAt).toLocaleDateString('ar-SA') : ''}</p>
      </div>
    </div>
  );
}
