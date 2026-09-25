'use client';

import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ChatLayout } from '@/features/chat/ChatLayout';
import { ContractModal } from '@/features/contracts/ContractModal';
import { CVPreviewModal } from '@/features/specialists/cv/CVPreviewModal';
import { getPublicSpecialist } from '@/features/directory/directoryService';
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
        currentUid={user.uid}
        listTitle="المحادثات النشطة"
        listIcon="forum"
        emptyIcon="chat_bubble"
        emptyTitle="مساحة العمل المشتركة"
        emptyDescription="اختر أخصائياً من القائمة لبدء المحادثة وإبرام العقود."
        inputPlaceholder="اكتب رسالتك..."
        headerIcon="person"
        renderHeaderActions={({ activeChatId, otherId }) => (
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => void viewSpecialistCv(otherId)}
              disabled={loadingCv}
              className="bg-white border text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-container-high transition-colors shadow-sm flex items-center gap-1 disabled:opacity-70"
            >
              {loadingCv ? (
                <Spinner className="w-3.5 h-3.5 border-2" />
              ) : (
                <span className="material-symbols-outlined text-[14px]">visibility</span>
              )}{' '}
              عرض الـ CV
            </button>
            <button
              type="button"
              onClick={() => {
                setContractTarget(activeChatId);
                setContractOpen(true);
              }}
              className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#006d44] transition-colors shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add_task</span> إنشاء عقد
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
        data={cvPreview ?? {}}
        asOrganization
      />
    </>
  );
}