'use client';

import { Modal } from '@/components/ui/Modal';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

/** Privacy policy modal — content copied verbatim from the legacy source. */
export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="سياسة الخصوصية" icon="privacy_tip">
      <div className="overflow-y-auto space-y-4 text-sm text-secondary leading-relaxed p-2">
        <h4 className="font-bold text-primary">1. مقدمة</h4>
        <p>نحن في منصة بيئيين نولي اهتماماً بالغاً لخصوصية بياناتك...</p>
        <h4 className="font-bold text-primary">2. جمع البيانات</h4>
        <p>نقوم بجمع البيانات الأساسية اللازمة فقط...</p>
      </div>
    </Modal>
  );
}