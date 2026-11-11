'use client';

import { ChatLayout } from '@/features/chat/ChatLayout';
import { useAuth } from '@/features/auth/AuthProvider';

/** Specialist messages tab (legacy requests pane + secure-channel badge). */
export function SpecialistMessages() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <ChatLayout
      role="spec"
      currentUid={user.id}
      listTitle="الطلبات والمحادثات"
      listIcon="inbox"
      emptyIcon="forum"
      emptyTitle="نافذة التواصل الآمن"
      emptyDescription="اختر محادثة من القائمة لعرض التفاصيل أو الموافقة على الطلبات الجديدة."
      inputPlaceholder="اكتب رسالتك هنا..."
      headerIcon="corporate_fare"
      renderHeaderActions={() => (
        <span className="badge badge-success shrink-0">
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">lock</span> قناة مشفرة
        </span>
      )}
    />
  );
}