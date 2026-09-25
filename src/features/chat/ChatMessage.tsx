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
 * messages render role-specific bubbles (legacy `chat-bubble-me/other` for
 * specialists, blue/white bubbles for organizations).
 */
export function ChatMessage({ message, currentUid, role }: ChatMessageProps) {
  if (message.isContract) {
    return <ContractMessage message={message} currentUid={currentUid} role={role} />;
  }

  const isMe = message.senderId === currentUid;

  const bubbleClass = isMe
    ? role === 'spec'
      ? 'chat-bubble-me'
      : 'bg-blue-600 text-white rounded-br-none rounded-t-2xl rounded-bl-2xl'
    : role === 'spec'
      ? 'chat-bubble-other'
      : 'bg-white border text-slate-800 rounded-bl-none rounded-t-2xl rounded-br-2xl';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`${bubbleClass} px-4 py-2.5 max-w-[85%] text-sm font-medium leading-relaxed break-words`}
      >
        {message.text}
      </div>
    </div>
  );
}