import type { Message } from '@/types';

export interface SendMessageInput {
  chatId: string;
  senderId?: string;
  text: string;
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const res = await fetch('/api/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر إرسال الرسالة.');
  }
  return res.json();
}

/** Signs a contract from its chat card (same atomic server path as the request page). */
export async function signContract(
  target: { contractId?: string; messageId: string },
  signature: string,
): Promise<void> {
  const res = await fetch('/api/chat/contracts/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...target, signature }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر توقيع العقد.');
  }
}
