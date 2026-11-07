'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { ServiceRequest } from '@/types';

export function OrganizationRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/service-requests')
        .then((r) => r.json())
        .then((data) => setRequests(Array.isArray(data) ? data : []))
        .catch(() => setRequests([]))
        .finally(() => setLoaded(true));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">طلبات الخدمة</h2>
        <Link href="/organization/requests/new" className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90">
          طلب جديد
        </Link>
      </div>
      {!loaded && <p className="text-secondary text-sm">جاري التحميل...</p>}
      {loaded && requests.length === 0 && (
        <div className="bg-white rounded-2xl border p-8 text-center text-secondary">
          لا توجد طلبات. <Link href="/organization/requests/new" className="text-primary font-bold">أنشئ طلباً</Link>
        </div>
      )}
      {loaded && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <Link key={request.id} href={`/organization/requests/${request.id}`} className="block bg-white rounded-2xl border p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">{request.serviceName}</p>
                  <p className="text-xs text-secondary mt-1">{request.city} — {request.serviceCategory}</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{request.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
