'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { ServiceRequest } from '@/types';

export function SpecialistRequests() {
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
      <h2 className="text-xl font-bold text-primary">الطلبات الواردة</h2>
      {!loaded && <p className="text-secondary text-sm">جاري التحميل...</p>}
      {loaded && requests.length === 0 && (
        <div className="bg-white rounded-2xl border p-8 text-center text-secondary">لا توجد طلبات واردة.</div>
      )}
      {loaded && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link key={r.id} href={`/specialist/requests/${r.id}`} className="block bg-white rounded-2xl border p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">{r.serviceName}</p>
                  <p className="text-xs text-secondary mt-1">{r.city} — {r.serviceCategory}</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{r.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
