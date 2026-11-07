'use client';

import type { ConversationView } from './useConversations';

interface ChatListItemProps {
  conversation: ConversationView;
  active: boolean;
  onSelect: (chatId: string) => void;
}

/** One conversation row: counterpart name + last message (or "📄 عقد"). */
export function ChatListItem({ conversation, active, onSelect }: ChatListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.chatId)}
      aria-current={active ? 'true' : undefined}
      className={`w-full text-right p-3 bg-white border rounded-xl cursor-pointer hover:border-primary shadow-sm mb-2 transition-colors ${
        active ? 'border-primary' : ''
      }`}
    >
      <div className="font-bold text-primary text-sm">{conversation.otherName}</div>
      <div className="text-xs text-secondary truncate">
        {conversation.lastMessageIsContract ? '📄 عقد' : conversation.lastMessage || ''}
      </div>
    </button>
  );
}