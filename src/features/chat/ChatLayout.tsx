'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, type ReactNode } from 'react';

import type { UserRole } from '@/types';

import { ChatComposer } from './ChatComposer';
import { ChatHeader } from './ChatHeader';
import { ChatList } from './ChatList';
import { ChatMessages } from './ChatMessages';
import { useChatMessages } from './useChatMessages';
import { useConversations } from './useConversations';

interface ChatLayoutProps {
  role: UserRole;
  currentUid: string;
  listTitle: string;
  listIcon: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyDescription: string;
  inputPlaceholder: string;
  headerIcon: string;
  /** Right side of the chat header (encrypted badge / CV + contract buttons). */
  renderHeaderActions?: (context: { activeChatId: string; otherId: string | null }) => ReactNode;
}

/**
 * Split-pane realtime chat used by both dashboards. The active conversation
 * lives in the URL (`?chat=`) so it survives reloads; every listener is
 * cleaned up when the layout unmounts or the conversation changes.
 */
export function ChatLayout({
  role,
  currentUid,
  listTitle,
  listIcon,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  inputPlaceholder,
  headerIcon,
  renderHeaderActions,
}: ChatLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get('chat');

  const { conversations, loading, error } = useConversations(currentUid, role);
  const { messages, loading: messagesLoading, error: messagesError } = useChatMessages(
    activeChatId,
    currentUid,
  );

  const activeConversation = conversations.find((c) => c.chatId === activeChatId) ?? null;

  const selectChat = useCallback(
    (chatId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('chat', chatId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="h-[75vh] fade-up flex flex-col md:flex-row gap-6">
      <ChatList
        title={listTitle}
        icon={listIcon}
        conversations={conversations}
        loading={loading}
        error={error}
        activeChatId={activeChatId}
        onSelect={selectChat}
      />

      <div className="w-full md:w-2/3 bg-white rounded-3xl shadow-sm border border-outline-variant flex flex-col relative h-[50vh] md:h-full overflow-hidden">
        {!activeChatId && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-container-lowest z-10">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              {emptyIcon}
            </span>
            <h3 className="text-lg font-bold text-primary mb-2">{emptyTitle}</h3>
            <p className="text-sm text-secondary">{emptyDescription}</p>
          </div>
        )}

        {activeChatId && (
          <>
            <ChatHeader
              icon={headerIcon}
              otherName={activeConversation?.otherName ?? 'جهة العمل'}
              actions={renderHeaderActions?.({
                activeChatId,
                otherId: activeConversation?.otherId ?? null,
              })}
            />
            <ChatMessages
              messages={messages}
              loading={messagesLoading}
              error={messagesError}
              currentUid={currentUid}
              role={role}
            />
            <ChatComposer
              chatId={activeChatId}
              senderId={currentUid}
              placeholder={inputPlaceholder}
            />
          </>
        )}
      </div>
    </div>
  );
}