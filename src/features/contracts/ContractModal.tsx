'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Field, describedBy } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
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
        await createContract(chatId, values);
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
    <Modal open={open} onClose={onClose} title="إنشاء عقد عمل" icon="draw" panelClassName="max-w-md">
      <form className="space-y-4 overflow-y-auto" onSubmit={onSubmit} noValidate>
        <Field id="cont_title" label="اسم الخدمة / المهمة" required error={errors.title?.message}>
          <input id="cont_title" type="text" {...register('title')} aria-invalid={Boolean(errors.title)} aria-describedby={describedBy('cont_title', { error: errors.title })} className="field-input" />
        </Field>

        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
          <Field id="cont_duration" label="المدة المتوقعة" required error={errors.duration?.message}>
            <input id="cont_duration" type="text" {...register('duration')} aria-invalid={Boolean(errors.duration)} aria-describedby={describedBy('cont_duration', { error: errors.duration })} className="field-input" placeholder="مثال: شهرين" />
          </Field>
          <Field id="cont_value" label="القيمة (ريال)" required error={errors.value?.message}>
            <input id="cont_value" type="number" dir="ltr" {...register('value')} aria-invalid={Boolean(errors.value)} aria-describedby={describedBy('cont_value', { error: errors.value })} className="field-input text-left" />
          </Field>
        </div>

        <Field id="cont_org_sig" label="توقيع الجهة (الاسم)" required error={errors.orgSig?.message}>
          <input id="cont_org_sig" type="text" {...register('orgSig')} aria-invalid={Boolean(errors.orgSig)} aria-describedby={describedBy('cont_org_sig', { error: errors.orgSig })} className="field-input border-secondary/50 bg-accent-soft text-center font-bold text-forest focus:bg-white" />
        </Field>

        <LoadingButton type="submit" loading={sending} loadingLabel="جاري..." showSpinner className="btn btn-primary btn-block btn-lg mt-2">
          إرسال العقد للأخصائي
        </LoadingButton>
      </form>
    </Modal>
  );
}
