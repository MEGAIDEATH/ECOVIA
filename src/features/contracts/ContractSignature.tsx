'use client';

import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { signContract } from '@/features/chat/messageRepository';

interface ContractSignatureProps {
  messageId: string;
  currentUid: string;
}

/**
 * Inline specialist signature input shown on pending contracts
 * (legacy `confirmInlineSignature`).
 */
export function ContractSignature({ messageId, currentUid }: ContractSignatureProps) {
  const [name, setName] = useState('');
  const [signing, setSigning] = useState(false);
  const { showToast } = useToast();

  const confirmSignature = async () => {
    const signature = name.trim();
    if (!signature) {
      showToast('اكتب اسمك للتوقيع', true);
      return;
    }

    setSigning(true);
    try {
      await signContract(messageId, signature, currentUid);
      showToast('تم اعتماد العقد بنجاح!');
    } catch (error) {
      console.error('[contract] signature failed:', error);
      const message = error instanceof Error ? error.message : 'تعذر توقيع العقد.';
      showToast(message, true);
      setSigning(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full px-1">
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={signing}
        aria-label="اسمك"
        placeholder="اسمك"
        className="w-full px-2 py-1 border rounded text-center text-sm outline-none focus:border-primary disabled:bg-surface-container-low"
      />
      <button
        type="button"
        onClick={() => void confirmSignature()}
        disabled={signing}
        className="bg-primary text-white text-xs py-1 rounded font-bold hover:bg-[#006d44] transition-colors disabled:opacity-70"
      >
        {signing ? 'جاري...' : 'توقيع'}
      </button>
    </div>
  );
}