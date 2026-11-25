'use client';

import { ChatLayout } from '@/features/chat/ChatLayout';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Specialist messages. (The former "قناة مشفرة" badge was removed: messages
 * are protected in transit and by access control, not end-to-end encrypted.)
 */
export function SpecialistMessages() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <ChatLayout
      role="spec"
      currentUid={user.id}
      listTitle="المحادثات"
      listIcon="inbox"
      emptyIcon="forum"
      emptyTitle="المراسلات مع المنشآت"
      emptyDescription="اختر محادثة من القائمة. تبدأ المحادثة مع منشأة بعد تقديم عرض على أحد طلباتها أو عند تواصلها معك."
      inputPlaceholder="اكتب رسالتك هنا..."
      headerIcon="corporate_fare"
      renderHeaderActions={() => (
        <span className="badge badge-neutral shrink-0">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">lock</span> محادثة خاصة بين الطرفين
        </span>
      )}
    />
  );
}
