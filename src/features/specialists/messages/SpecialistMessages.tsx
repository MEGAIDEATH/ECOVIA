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
      currentUid={user.uid}
      listTitle="الطلبات والمحادثات"
      listIcon="inbox"
      emptyIcon="forum"
      emptyTitle="نافذة التواصل الآمن"
      emptyDescription="اختر محادثة من القائمة لعرض التفاصيل أو الموافقة على الطلبات الجديدة."
      inputPlaceholder="اكتب رسالتك هنا..."
      headerIcon="corporate_fare"
      renderHeaderActions={() => (
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 flex-shrink-0">
          <span className="material-symbols-outlined text-[14px]">lock</span> قناة مشفرة
        </span>
      )}
    />
  );
}