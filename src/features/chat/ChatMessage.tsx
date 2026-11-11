'use client';

import type { Message, UserRole } from '@/types';
import { ContractMessage } from '@/features/contracts/ContractMessage';

interface ChatMessageProps {
  message: Message;
  currentUid: string;
  role: UserRole;
}

/**
 * One chat entry: contract messages render the contract card, regular
 * messages render brand bubbles (own messages forest, others white) —
 * identical for both workspaces.
 */
export function ChatMessage({ message, currentUid, role }: ChatMessageProps) {
  if (message.isContract) {
    return <ContractMessage message={message} role={role} />;
  }

  const isMe = message.senderUserId === currentUid;

  // RTL: own messages sit on the left with their tail at the bottom-left.
  const bubbleClass = isMe
    ? 'bg-forest text-white rounded-2xl rounded-bl-sm'
    : 'bg-white border border-line text-on-surface rounded-2xl rounded-br-sm';

  return (
    <div className={`mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${bubbleClass} px-4 py-2.5 max-w-[85%] text-sm font-medium leading-relaxed break-words`}
      >
        {message.text}
      </div>
    </div>
  );
}