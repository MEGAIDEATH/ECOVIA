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
    <div className="fade-up flex h-[75vh] min-h-[520px] flex-col gap-4 md:flex-row md:gap-6">
      <ChatList
        title={listTitle}
        icon={listIcon}
        conversations={conversations}
        loading={loading}
        error={error}
        activeChatId={activeChatId}
        onSelect={selectChat}
      />

      <div className="card relative flex h-[50vh] w-full flex-col overflow-hidden md:h-full md:w-2/3">
        {!activeChatId && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-6 text-center">
            <span className="icon-tile icon-tile-lg mb-4">
              <span aria-hidden="true" className="material-symbols-outlined text-[28px]">{emptyIcon}</span>
            </span>
            <h3 className="mb-1 text-lg font-bold text-forest">{emptyTitle}</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted">{emptyDescription}</p>
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