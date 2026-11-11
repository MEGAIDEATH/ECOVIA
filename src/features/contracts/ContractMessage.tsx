'use client';

import type { Message, UserRole } from '@/types';

import { ContractSignature } from './ContractSignature';
import { ContractStatusBadge } from './ContractStatusBadge';

interface ContractMessageProps {
  message: Message;
  role: UserRole;
}

/**
 * Contract card inside the chat — visual structure, badges, signatures and
 * states ported 1:1 from the legacy implementation.
 */
export function ContractMessage({ message, role }: ContractMessageProps) {
  const contract = message.contractData;
  if (!contract) return null;

  const signed = contract.status === 'signed';

  return (
    <div className="flex justify-center mb-4 w-full">
      <div
        className={`relative w-[95%] rounded-panel border-2 bg-white p-5 shadow-float md:p-6 ${signed ? 'border-success/40' : 'border-secondary/40'}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h4 className={`flex items-center gap-2 text-lg font-bold ${signed ? 'text-success' : 'text-forest'}`}>
            <span aria-hidden="true" className="material-symbols-outlined">contract</span>
            وثيقة عقد
          </h4>
          <ContractStatusBadge signed={signed} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="flex flex-col items-center justify-center rounded-control border border-line bg-wash p-3">
            <p className="text-muted font-bold text-xs mb-1">المنشأة</p>
            <p className="font-latin text-lg font-bold break-words text-forest">
              {contract.orgSig}
            </p>
          </div>
          <div className="flex min-h-[80px] flex-col items-center justify-center rounded-control border border-line bg-wash p-3">
            <p className="text-muted font-bold text-xs mb-1">الأخصائي</p>
            {signed ? (
              <p className="font-latin text-lg font-bold break-words text-success">
                {contract.specSig}
              </p>
            ) : role === 'spec' ? (
              <ContractSignature messageId={message.id} />
            ) : (
              <p className="mt-2 text-sm font-bold text-warning motion-safe:animate-pulse">
                بانتظار الأخصائي...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}