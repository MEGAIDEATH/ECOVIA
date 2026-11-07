'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FormData {
  serviceCategory: string;
  serviceName: string;
  region: string;
  city: string;
  duration: string;
  description: string;
}
const initial: FormData = { serviceCategory: '', serviceName: '', region: '', city: '', duration: '', description: '' };

export function OrganizationRequestNew() {
  const router = useRouter();
  const [data, setData] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!data.serviceCategory.trim()) next.serviceCategory = 'تصنيف الخدمة مطلوب';
    if (!data.serviceName.trim()) next.serviceName = 'اسم الخدمة مطلوب';
    if (!data.region.trim()) next.region = 'المنطقة مطلوبة';
    if (!data.city.trim()) next.city = 'المدينة مطلوبة';
    if (!data.duration.trim()) next.duration = 'المدة مطلوبة';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'فشل الإرسال');
      }
      const created = await res.json();
      router.push(`/organization/requests/${created.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-up">
      <Link href="/organization/requests" className="text-primary hover:underline text-sm">← الرجوع</Link>
      <h2 className="text-xl font-bold text-primary">طلب خدمة بيئية</h2>
      <div className="bg-white rounded-2xl border p-6 space-y-4">
        <div><label className="block text-sm font-bold mb-1">تصنيف الخدمة</label>
          <input type="text" value={data.serviceCategory} onChange={(e) => setData({ ...data, serviceCategory: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          {errors.serviceCategory && <p className="text-red-500 text-xs mt-1">{errors.serviceCategory}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">اسم الخدمة</label>
          <input type="text" value={data.serviceName} onChange={(e) => setData({ ...data, serviceName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          {errors.serviceName && <p className="text-red-500 text-xs mt-1">{errors.serviceName}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">المنطقة</label>
          <input type="text" value={data.region} onChange={(e) => setData({ ...data, region: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">المدينة</label>
          <input type="text" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">المدة</label>
          <input type="text" value={data.duration} onChange={(e) => setData({ ...data, duration: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">وصف (اختياري)</label>
          <textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} /></div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => void submit()} disabled={submitting} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
          {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </button>
      </div>
    </div>
  );
}
