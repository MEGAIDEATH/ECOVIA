'use client';

import { useState, type FormEvent } from 'react';

import { useToast } from '@/components/ui/Toast';
import { sendMessage } from './messageRepository';

interface ChatComposerProps {
  chatId: string;
  senderId: string;
  placeholder: string;
}

/** Message input + send button (legacy chat forms). */
export function ChatComposer({ chatId, senderId, placeholder }: ChatComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    try {
      await sendMessage({ chatId, senderId, text: trimmed });
    } catch (error) {
      console.error('[chat] send failed:', error);
      showToast('تعذر إرسال الرسالة، حاول مرة أخرى.', true);
      setText(trimmed); // restore so the text is not lost
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 border-t border-line bg-white p-3"
    >
      <label htmlFor="chat-input" className="sr-only">
        نص الرسالة
      </label>
      <input
        id="chat-input"
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={sending}
        placeholder={placeholder}
        className="field-input flex-1 rounded-full"
      />
      <button
        type="submit"
        disabled={sending || text.trim().length === 0}
        aria-label="إرسال"
        className="btn btn-primary btn-icon size-12 shrink-0"
      >
        <span aria-hidden="true" className="material-symbols-outlined rotate-180">send</span>
      </button>
    </form>
  );
}