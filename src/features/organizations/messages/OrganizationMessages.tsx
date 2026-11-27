'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChatLayout } from '@/features/chat/ChatLayout';
import { getPublicSpecialist } from '@/features/directory/directoryService';
import { CVPreviewModal } from '@/features/specialists/cv/CVPreviewModal';
import { toCvPreviewData } from '@/lib/utils/cv';
import type { PublicSpecialist } from '@/types';

/**
 * Organization messages: chat + the counterpart specialist's CV. The CV is
 * looked up by the specialist's PROFILE id through the authorized directory
 * API (approved organizations only). Contracts are prepared from a selected
 * offer on the request page and appear here as contract cards.
 */
export function OrganizationMessages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cvPreview, setCvPreview] = useState<PublicSpecialist | null>(null);
  const [loadingCv, setLoadingCv] = useState(false);

  if (!user) return null;

  const viewSpecialistCv = async (specialistProfileId: string | null) => {
    if (!specialistProfileId || loadingCv) return;
    setLoadingCv(true);
    try {
      setCvPreview(await getPublicSpecialist(specialistProfileId));
    } catch (error) {
      console.error('[organization] CV load failed:', error);
      showToast(error instanceof Error ? error.message : 'تعذر تحميل السيرة الذاتية.', true);
    } finally {
      setLoadingCv(false);
    }
  };

  return (
    <>
      <ChatLayout
        role="org"
        currentUid={user.id}
        listTitle="المحادثات النشطة"
        listIcon="forum"
        emptyIcon="chat_bubble"
        emptyTitle="مساحة العمل المشتركة"
        emptyDescription="اختر أخصائياً من القائمة لمتابعة المحادثة. تُعدّ العقود من صفحة الطلب بعد اختيار عرض الأخصائي."
        inputPlaceholder="اكتب رسالتك..."
        headerIcon="person"
        renderHeaderActions={({ otherProfileId }) => (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void viewSpecialistCv(otherProfileId)}
              disabled={loadingCv || !otherProfileId}
              className="btn btn-secondary btn-sm"
              data-testid="chat-view-cv"
            >
              {loadingCv ? (
                <Spinner className="h-3.5 w-3.5 border-2" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
              )}{' '}
              عرض الـ CV
            </button>
            {otherProfileId && (
              <Link href={`/organization/specialists/${otherProfileId}`} className="btn btn-ghost btn-sm">
                الملف الكامل
              </Link>
            )}
          </div>
        )}
      />

      <CVPreviewModal
        open={cvPreview !== null}
        onClose={() => setCvPreview(null)}
        data={cvPreview ? toCvPreviewData(cvPreview) : {}}
        asOrganization
      />
    </>
  );
}
