'use client';

import { useEffect, useRef } from 'react';

import { LoadingState } from '@/components/ui/Feedback';
import type { Message, UserRole } from '@/types';

import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  error: boolean;
  currentUid: string;
  role: UserRole;
}

/** Scrollable message stream with legacy empty/loading states. */
export function ChatMessages({ messages, loading, error, currentUid, role }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll-to-bottom on every message change (legacy behavior).
  useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  if (loading) {
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-surface/50 relative">
        <LoadingState message="جاري الفتح..." className="text-center text-xs text-gray-400 my-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-surface/50 relative">
        <p className="text-center text-xs text-red-500 my-4">تعذر تحميل الرسائل.</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-surface/50 relative">
        <p className="text-center text-xs text-gray-400 my-4">لا توجد رسائل.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 bg-surface/50 relative"
      aria-live="polite"
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          currentUid={currentUid}
          role={role}
        />
      ))}
    </div>
  );
}