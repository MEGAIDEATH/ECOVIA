'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { ServiceRequest } from '@/types';

export function OrganizationRequestDetail() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/service-requests/${params?.id}`)
        .then((r) => r.json())
        .then((data) => setRequest(data && data.id ? data : null))
        .catch(() => setRequest(null))
        .finally(() => setLoaded(true));
    }, 0);
    return () => clearTimeout(timer);
  }, [params?.id]);

  if (!loaded) return <p className="text-secondary text-sm">جاري التحميل...</p>;
  if (!request) return <div className="bg-white rounded-2xl border p-8 text-center text-secondary">الطلب غير موجود.</div>;

  return (
    <div className="space-y-6 fade-up">
      <Link href="/organization/requests" className="text-primary hover:underline text-sm">← الرجوع للقائمة</Link>
      <h2 className="text-xl font-bold text-primary">تفاصيل الطلب</h2>
      <div className="bg-white rounded-2xl border p-6 space-y-2 text-sm">
        <p><strong>تصنيف الخدمة:</strong> {request.serviceCategory}</p>
        <p><strong>اسم الخدمة:</strong> {request.serviceName}</p>
        <p><strong>المنطقة:</strong> {request.region}</p>
        <p><strong>المدينة:</strong> {request.city}</p>
        <p><strong>المدة:</strong> {request.duration}</p>
        <p><strong>الحالة:</strong> {request.status}</p>
        {request.description && <p><strong>الوصف:</strong> {request.description}</p>}
      </div>
    </div>
  );
}
