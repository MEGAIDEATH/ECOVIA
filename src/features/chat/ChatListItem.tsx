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
      className={`w-full rounded-control border p-3 text-start transition-colors ${
        active ? 'border-secondary/40 bg-accent-soft' : 'border-transparent bg-white hover:border-line hover:bg-wash'
      }`}
    >
      <div className="text-sm font-bold text-forest">{conversation.otherName}</div>
      <div className="text-xs text-muted truncate">
        {conversation.lastMessageIsContract ? '📄 عقد' : conversation.lastMessage || ''}
      </div>
    </button>
  );
}