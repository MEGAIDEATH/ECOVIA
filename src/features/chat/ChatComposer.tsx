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
      className="p-3 bg-white border-t border-outline-variant/50 flex gap-2"
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
        className="flex-1 px-4 py-3 bg-surface-container-low rounded-full border border-transparent focus:border-primary outline-none transition-all text-sm"
      />
      <button
        type="submit"
        disabled={sending || text.trim().length === 0}
        aria-label="إرسال"
        className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-[#006d44] transition-colors shadow-sm disabled:opacity-60"
      >
        <span className="material-symbols-outlined">send</span>
      </button>
    </form>
  );
}