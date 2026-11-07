'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import type { ServiceRequest } from '@/types';

export function SpecialistRequestDetail() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);

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

  const handleAccept = async () => {
    if (!request || processing) return;
    setProcessing(true);
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/service-requests/${request.id}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error('فشل');
      const updated = await res.json();
      setRequest(updated);
      setResult('accepted');
    } catch {
      alert('حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request || processing) return;
    if (!reason.trim()) { alert('سبب الرفض مطلوب'); return; }
    setProcessing(true);
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/service-requests/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('فشل');
      const updated = await res.json();
      setRequest(updated);
      setResult('rejected');
    } catch {
      alert('حدث خطأ');
    } finally {
      setProcessing(false);
    }
  };

  if (!loaded) return <p className="text-secondary text-sm">جاري التحميل...</p>;
  if (!request) return <div className="bg-white rounded-2xl border p-8 text-center text-secondary">الطلب غير موجود.</div>;

  return (
    <div className="space-y-6 fade-up">
      <Link href="/specialist/requests" className="text-primary hover:underline text-sm">← الرجوع للقائمة</Link>
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
      {request.status === 'pending' && (
        <div className="flex gap-3">
          <button type="button" onClick={() => setConfirmAction('accept')} disabled={processing} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60">قبول</button>
          <button type="button" onClick={() => setConfirmAction('reject')} disabled={processing} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60">رفض</button>
        </div>
      )}
      {processing && <p className="text-secondary text-sm">جاري المعالجة...</p>}
      {result === 'accepted' && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg">
          تم قبول الطلب. {request.conversationId && <Link href="/specialist/messages" className="font-bold underline">فتح المحادثة</Link>}
        </div>
      )}
      {result === 'rejected' && <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">تم رفض الطلب.</div>}
      <Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)} title="تأكيد" icon="warning">
        <p className="text-sm mb-4">{confirmAction === 'accept' ? 'هل أنت متأكد من قبول الطلب؟' : 'هل أنت متأكد من رفض الطلب؟'}</p>
        {confirmAction === 'reject' && (
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-4" rows={3} placeholder="سبب الرفض" />
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
          <button type="button" onClick={() => (confirmAction === 'accept' ? void handleAccept() : void handleReject())} className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${confirmAction === 'accept' ? 'bg-primary' : 'bg-red-600'}`}>تأكيد</button>
        </div>
      </Modal>
    </div>
  );
}
