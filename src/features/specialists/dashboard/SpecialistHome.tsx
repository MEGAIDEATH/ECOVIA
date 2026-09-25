'use client';

import Link from 'next/link';

import { useSpecialistDashboard } from './SpecialistDashboardProvider';

/** Specialist home tab — static statistics/placeholders preserved from legacy. */
export function SpecialistHome() {
  const { specialist } = useSpecialistDashboard();

  return (
    <div className="space-y-6 fade-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2 bg-primary/10 p-2 rounded-full">
            work_history
          </span>
          <h4 className="text-2xl font-bold text-on-surface">0</h4>
          <p className="text-xs text-secondary font-bold">مشاريع قيد التنفيذ</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-orange-100 rounded-full animate-pulse" />
          <span className="material-symbols-outlined text-orange-500 text-3xl mb-2 bg-orange-50 p-2 rounded-full relative z-10">
            mark_email_unread
          </span>
          <h4 className="text-2xl font-bold text-on-surface relative z-10">0</h4>
          <p className="text-xs text-secondary font-bold relative z-10">طلبات جديدة</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-blue-500 text-3xl mb-2 bg-blue-50 p-2 rounded-full">
            description
          </span>
          <h4 className="text-2xl font-bold text-on-surface">1</h4>
          <p className="text-xs text-secondary font-bold">سيرة مكتملة</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-green-500 text-3xl mb-2 bg-green-50 p-2 rounded-full">
            verified
          </span>
          <h4 className="text-lg font-bold text-green-600 mt-2">
            {specialist?.status === 'approved' ? 'معتمد' : 'معلق'}
          </h4>
          <p className="text-xs text-secondary font-bold">حالة الحساب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">notifications_active</span> أحدث الطلبات
            </h3>
            <Link
              href="/specialist/messages"
              className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
            >
              عرض الكل
            </Link>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-secondary text-center py-10 opacity-70">
              لا توجد طلبات جديدة حالياً.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">rocket_launch</span> المشاريع النشطة
            </h3>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-secondary text-center py-10 opacity-70">
              لا توجد مشاريع قيد التنفيذ. اقبل بعض الطلبات لتبدأ!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}