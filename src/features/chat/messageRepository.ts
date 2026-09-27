import type { ContractValues } from '@/lib/validation/forms';
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

export async function createContract(chatId: string, values: ContractValues): Promise<void> {
  const res = await fetch('/api/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      isContract: true,
      contractData: {
        title: values.title,
        value: values.value,
        duration: values.duration,
        orgSig: values.orgSig,
      },
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر إرسال العقد.');
  }
}

export async function signContract(messageId: string, signature: string): Promise<void> {
  const res = await fetch('/api/chat/contracts/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, signature }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'تعذر توقيع العقد.');
  }
}
