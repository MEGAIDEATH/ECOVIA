'use client';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { ChatListItem } from './ChatListItem';
import type { ConversationView } from './useConversations';

interface ChatListProps {
  title: string;
  icon: string;
  conversations: ConversationView[];
  loading: boolean;
  error: boolean;
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
}

/** Conversation list pane (legacy: "الطلبات والمحادثات" / "المحادثات النشطة"). */
export function ChatList({ title, icon, conversations, loading, error, activeChatId, onSelect }: ChatListProps) {
  return (
    <div className="card flex h-[40vh] w-full flex-col overflow-hidden md:h-full md:w-1/3">
      <div className="border-b border-line bg-wash px-4 py-3.5">
        <h3 className="flex items-center gap-2 font-bold text-forest">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-secondary">{icon}</span> {title}
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading && <LoadingState message="جاري التحميل..." />}
        {error && !loading && <ErrorState />}
        {!loading && !error && conversations.length === 0 && (
          <EmptyState message="لا توجد محادثات نشطة" />
        )}
        {!loading &&
          !error &&
          conversations.map((conversation) => (
            <ChatListItem
              key={conversation.chatId}
              conversation={conversation}
              active={conversation.chatId === activeChatId}
              onSelect={onSelect}
            />
          ))}
      </div>
    </div>
  );
}