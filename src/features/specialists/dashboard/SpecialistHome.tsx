'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LoadingState } from '@/components/ui/Feedback';
import { getApplicationsForSpecialist } from '@/features/applications/applicationRepository';
import type { Application } from '@/types';

export function SpecialistHome() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getApplicationsForSpecialist()
      .then((list) => { if (active) setApplications(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    const timer = setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem('ecovia:prototype:org-requests');
        const list = raw ? JSON.parse(raw) : [];
        setIncomingCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setIncomingCount(0);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 fade-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 bg-primary/10 p-2 rounded-full">work_history</span>
          <h4 className="text-2xl font-bold text-on-surface">{applications.length}</h4>
          <p className="text-xs text-secondary font-bold">مشاريع قيد التنفيذ</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="material-symbols-outlined text-orange-500 text-3xl mb-2 bg-orange-50 p-2 rounded-full relative z-10">mark_email_unread</span>
          <h4 className="text-2xl font-bold text-on-surface relative z-10">{incomingCount}</h4>
          <p className="text-xs text-secondary font-bold relative z-10">طلبات جديدة</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-blue-500 text-3xl mb-2 bg-blue-50 p-2 rounded-full">description</span>
          <h4 className="text-2xl font-bold text-on-surface">{applications.length > 0 ? 1 : 0}</h4>
          <p className="text-xs text-secondary font-bold">سيرة مكتملة</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-green-500 text-3xl mb-2 bg-green-50 p-2 rounded-full">verified</span>
          <h4 className="text-lg font-bold text-green-600 mt-2">معتمد</h4>
          <p className="text-xs text-secondary font-bold">حالة الحساب</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">notifications_active</span> أحدث الطلبات
            </h3>
            <Link href="/specialist/requests" className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors">
              عرض الكل
            </Link>
          </div>
          <div className="space-y-3">
            {incomingCount === 0 ? (
              <div className="text-sm text-secondary text-center py-10 opacity-70">لا توجد طلبات جديدة حالياً.</div>
            ) : (
              <Link href="/specialist/requests" className="block text-sm text-primary font-bold text-center py-4">
                لديك {incomingCount} طلب(ات) جديدة — عرض
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">rocket_launch</span> المشاريع النشطة
            </h3>
          </div>
          <div className="space-y-3">
            {loading && <LoadingState message="جاري التحميل..." className="text-sm text-secondary text-center py-4" />}
            {!loading && applications.length === 0 && (
              <div className="text-sm text-secondary text-center py-10 opacity-70">لا توجد مشاريع قيد التنفيذ. اقبل بعض الطلبات لتبدأ!</div>
            )}
            {!loading && applications.map((app) => (
              <Link key={app.id} href={`/specialist/projects/${app.id}`} className="block bg-surface-container-low rounded-xl p-3 text-sm hover:bg-surface-container-high">
                {app.organizationName || 'منشأة'} — قيد التنفيذ
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}