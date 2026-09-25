'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { contractSchema, type ContractValues } from '@/lib/validation/forms';
import { useAuth } from '@/features/auth/AuthProvider';
import { createContract } from '@/features/chat/messageRepository';

interface ContractModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string | null;
}

const FIELD = 'block font-bold text-slate-700 mb-1';
const INPUT = 'w-full px-3 py-2 bg-slate-50 border rounded-lg focus:border-primary outline-none';

/** Contract creation modal (organization side) — legacy labels preserved. */
export function ContractModal({ open, onClose, chatId }: ContractModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: { title: '', duration: '', value: '', orgSig: '' },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      if (!user || !chatId) return;
      setSending(true);
      try {
        await createContract(chatId, user.uid, values);
        reset();
        onClose();
        showToast('تم إرسال العقد');
      } catch (error) {
        console.error('[contract] send failed:', error);
        showToast('تعذر إرسال العقد، حاول مرة أخرى.', true);
      } finally {
        setSending(false);
      }
    },
    () => {
      // Legacy aggregate validation toast, alongside inline field errors.
      showToast('تعبئة جميع البيانات!', true);
    },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء عقد عمل"
      icon="draw"
      panelClassName="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden p-6 relative"
    >
      <form className="space-y-4 text-sm" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="cont_title" className={FIELD}>
            اسم المشروع / المهمة
          </label>
          <input id="cont_title" type="text" {...register('title')} className={INPUT} />
          {errors.title && (
            <p role="alert" className="mt-1 text-xs font-bold text-red-500">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cont_duration" className={FIELD}>
              المدة المتوقعة
            </label>
            <input
              id="cont_duration"
              type="text"
              {...register('duration')}
              className={INPUT}
              placeholder="مثال: شهرين"
            />
            {errors.duration && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.duration.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="cont_value" className={FIELD}>
              القيمة (ريال)
            </label>
            <input id="cont_value" type="number" {...register('value')} className={INPUT} />
            {errors.value && (
              <p role="alert" className="mt-1 text-xs font-bold text-red-500">
                {errors.value.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="cont_org_sig" className={FIELD}>
            توقيع الجهة (الاسم)
          </label>
          <input
            id="cont_org_sig"
            type="text"
            {...register('orgSig')}
            className="w-full px-3 py-2 border-2 border-primary bg-primary/5 rounded-lg focus:bg-white outline-none font-bold text-primary text-center"
          />
          {errors.orgSig && (
            <p role="alert" className="mt-1 text-xs font-bold text-red-500">
              {errors.orgSig.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors disabled:opacity-70"
        >
          {sending ? 'جاري...' : 'إرسال العقد للأخصائي'}
        </button>
      </form>
    </Modal>
  );
}