import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatList } from './ChatList';
import type { ConversationView } from './useConversations';

const conversations: ConversationView[] = [
  {
    chatId: 'chat_org1_spec1',
    participants: ['org1', 'spec1'],
    lastMessage: 'مرحباً، أود التقديم للعمل معكم.',
    lastMessageIsContract: false,
    otherId: 'org1',
    otherName: 'شركة التقنية البيئية المحدودة',
  },
  {
    chatId: 'chat_org2_spec1',
    participants: ['org2', 'spec1'],
    lastMessage: 'عقد جديد',
    lastMessageIsContract: true,
    otherId: 'org2',
    otherName: 'شركة الاخضر',
  },
];

describe('ChatList', () => {
  it('renders conversation names and last-message previews', () => {
    render(
      <ChatList
        title="الطلبات والمحادثات"
        icon="inbox"
        conversations={conversations}
        loading={false}
        error={false}
        activeChatId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('شركة التقنية البيئية المحدودة')).toBeInTheDocument();
    expect(screen.getByText('مرحباً، أود التقديم للعمل معكم.')).toBeInTheDocument();
    expect(screen.getByText('📄 عقد')).toBeInTheDocument();
    expect(screen.getByText('الطلبات والمحادثات')).toBeInTheDocument();
  });

  it('shows the legacy empty state', () => {
    render(
      <ChatList
        title="المحادثات النشطة"
        icon="forum"
        conversations={[]}
        loading={false}
        error={false}
        activeChatId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('لا توجد محادثات نشطة')).toBeInTheDocument();
  });

  it('shows the loading state', () => {
    render(
      <ChatList
        title="المحادثات النشطة"
        icon="forum"
        conversations={[]}
        loading
        error={false}
        activeChatId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
  });

  it('reports the selected chat id on click', () => {
    const onSelect = vi.fn();
    render(
      <ChatList
        title="الطلبات والمحادثات"
        icon="inbox"
        conversations={conversations}
        loading={false}
        error={false}
        activeChatId={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('شركة الاخضر'));
    expect(onSelect).toHaveBeenCalledWith('chat_org2_spec1');
  });
});