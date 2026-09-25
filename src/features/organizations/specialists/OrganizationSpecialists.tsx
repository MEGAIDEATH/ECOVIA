'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { sendMessage } from '@/features/chat/messageRepository';
import { buildChatId } from '@/lib/utils/chat';
import { CVPreviewModal } from '@/features/specialists/cv/CVPreviewModal';
import { getPublicSpecialist } from '@/features/directory/directoryService';
import type { PublicSpecialist, PublicSpecialistSummary } from '@/types';

import { SpecialistDirectory } from './SpecialistDirectory';

/** Organization tab: specialist directory + CV preview + contact handoff. */
export function OrganizationSpecialists() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cvPreview, setCvPreview] = useState<PublicSpecialist | null>(null);
  const [contacting, setContacting] = useState(false);

  const handleViewCv = async (specialistId: string) => {
    if (contacting) return;
    try {
      setCvPreview(await getPublicSpecialist(specialistId));
    } catch (error) {
      console.error('[organization] CV load failed:', error);
      showToast('حدث خطأ', true);
    }
  };

  const handleContact = async (specialist: PublicSpecialistSummary) => {
    if (!user || contacting) return;
    setContacting(true);
    try {
      const chatId = buildChatId(user.uid, specialist.id);
      await sendMessage({
        chatId,
        senderId: user.uid,
        text: 'مرحباً بك، تواصلنا معك بخصوص فرصة تعاون.',
      });
      showToast('تم فتح قناة تواصل');
      router.push(`/organization/messages?chat=${encodeURIComponent(chatId)}`);
    } catch (error) {
      console.error('[organization] start chat failed:', error);
      showToast('حدث خطأ', true);
    } finally {
      setContacting(false);
    }
  };

  return (
    <>
      <SpecialistDirectory
        onViewCv={(summary) => void handleViewCv(summary.id)}
        onContact={(summary) => void handleContact(summary)}
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