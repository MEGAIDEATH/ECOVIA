import type { Conversation } from '@/types';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/chat/conversations');
  if (!res.ok) return [];
  return res.json();
}
