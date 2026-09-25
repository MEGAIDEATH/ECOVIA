'use client';

import type { Message, UserRole } from '@/types';

import { ContractSignature } from './ContractSignature';
import { ContractStatusBadge } from './ContractStatusBadge';

interface ContractMessageProps {
  message: Message;
  currentUid: string;
  role: UserRole;
}

/**
 * Contract card inside the chat — visual structure, badges, signatures and
 * states ported 1:1 from the legacy implementation.
 */
export function ContractMessage({ message, currentUid, role }: ContractMessageProps) {
  const contract = message.contractData;
  if (!contract) return null;

  const signed = contract.status === 'signed';

  return (
    <div className="flex justify-center mb-4 w-full">
      <div
        className={`bg-white border-2 ${signed ? 'border-green-400' : 'border-primary'} shadow-lg rounded-3xl p-6 w-[95%] relative`}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h4 className={`font-bold ${signed ? 'text-green-700' : 'text-primary'} text-lg`}>
            وثيقة عقد
          </h4>
          <ContractStatusBadge signed={signed} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="bg-slate-50 p-3 rounded-xl border flex flex-col items-center justify-center">
            <p className="text-secondary font-bold text-xs mb-1">المنشأة</p>
            <p className="font-[Manrope] text-lg text-primary font-bold break-words">
              {contract.orgSig}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border flex flex-col items-center justify-center min-h-[80px]">
            <p className="text-secondary font-bold text-xs mb-1">الأخصائي</p>
            {signed ? (
              <p className="font-[Manrope] text-lg text-green-700 font-bold break-words">
                {contract.specSig}
              </p>
            ) : role === 'spec' ? (
              <ContractSignature messageId={message.id} currentUid={currentUid} />
            ) : (
              <p className="text-sm text-orange-500 mt-2 font-bold animate-pulse">
                بانتظار الأخصائي...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}