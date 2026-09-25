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
    <div className="w-full md:w-1/3 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant flex flex-col overflow-hidden h-[40vh] md:h-full">
      <div className="bg-surface-container-low p-4 border-b border-outline-variant/50">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">{icon}</span> {title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <LoadingState message="جاري التحميل..." />}
        {error && !loading && <ErrorState />}
        {!loading && !error && conversations.length === 0 && (
          <EmptyState message="لا توجد محادثات نشطة" className="text-center p-4 text-secondary text-sm" />
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