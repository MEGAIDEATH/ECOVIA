'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { sendMessage } from '@/features/chat/messageRepository';
import { buildChatId } from '@/lib/utils/chat';

/** Opens (or resumes) the organization ↔ specialist chat and navigates to it. */
export function useContactSpecialist() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [contacting, setContacting] = useState(false);

  const contact = async (specialistUserId: string) => {
    if (!user || contacting) return;
    setContacting(true);
    try {
      // Server contract: `chat_{orgUserId}_{specUserId}` (Better Auth user ids).
      const chatId = buildChatId(user.id, specialistUserId);
      await sendMessage({ chatId, senderId: user.id, text: 'مرحباً بك، تواصلنا معك بخصوص فرصة تعاون.' });
      showToast('تم فتح قناة تواصل');
      router.push(`/organization/messages?chat=${encodeURIComponent(chatId)}`);
    } catch (error) {
      console.error('[organization] start chat failed:', error);
      showToast('حدث خطأ', true);
    } finally {
      setContacting(false);
    }
  };

  return { contact, contacting };
}
