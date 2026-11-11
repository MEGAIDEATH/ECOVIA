'use client';

import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChatLayout } from '@/features/chat/ChatLayout';
import { ContractModal } from '@/features/contracts/ContractModal';
import { CVPreviewModal } from '@/features/specialists/cv/CVPreviewModal';
import { getPublicSpecialist } from '@/features/directory/directoryService';
import { toCvPreviewData } from '@/lib/utils/cv';
import type { PublicSpecialist } from '@/types';

/** Organization messages tab: chat + contract creation + specialist CV view. */
export function OrganizationMessages() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [contractOpen, setContractOpen] = useState(false);
  const [contractTarget, setContractTarget] = useState<string | null>(null);
  const [cvPreview, setCvPreview] = useState<PublicSpecialist | null>(null);
  const [loadingCv, setLoadingCv] = useState(false);

  if (!user) return null;

  const viewSpecialistCv = async (specId: string | null) => {
    if (!specId || loadingCv) return;
    setLoadingCv(true);
    try {
      const specialist = await getPublicSpecialist(specId);
      setCvPreview(specialist);
    } catch (error) {
      console.error('[organization] CV load failed:', error);
      showToast('حدث خطأ', true);
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
        emptyDescription="اختر أخصائياً من القائمة لبدء المحادثة وإبرام العقود."
        inputPlaceholder="اكتب رسالتك..."
        headerIcon="person"
        renderHeaderActions={({ activeChatId, otherId }) => (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void viewSpecialistCv(otherId)}
              disabled={loadingCv}
              className="btn btn-secondary btn-sm"
            >
              {loadingCv ? (
                <Spinner className="w-3.5 h-3.5 border-2" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
              )}{' '}
              عرض الـ CV
            </button>
            <button
              type="button"
              onClick={() => {
                setContractTarget(activeChatId);
                setContractOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_task</span> إنشاء عقد
            </button>
          </div>
        )}
      />

      <ContractModal
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        chatId={contractTarget}
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