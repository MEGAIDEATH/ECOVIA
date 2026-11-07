'use client';

import Link from 'next/link';

export function ChooseRoleView() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-primary text-center mb-2">إنشاء حساب</h1>
        <p className="text-secondary text-center mb-8">اختر نوع الحساب للمتابعة</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/register/specialist"
            className="bg-white rounded-2xl border border-outline-variant/30 p-6 text-center hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-4xl mb-2 block">person</span>
            <h2 className="font-bold text-on-surface mb-1">أخصائي بيئي</h2>
            <p className="text-sm text-secondary">للمتخصصين في المجال البيئي</p>
          </Link>
          <Link
            href="/register/organization"
            className="bg-white rounded-2xl border border-outline-variant/30 p-6 text-center hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-4xl mb-2 block">domain</span>
            <h2 className="font-bold text-on-surface mb-1">منشأة / جهة</h2>
            <p className="text-sm text-secondary">للشركات والمؤسسات</p>
          </Link>
        </div>
        <div className="text-center mt-6">
          <Link href="/login" className="text-primary font-bold hover:underline">
            لديك حساب؟ تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
