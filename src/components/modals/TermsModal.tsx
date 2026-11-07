'use client';

import { Modal } from '@/components/ui/Modal';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Terms & conditions modal — content copied verbatim from the legacy source. */
export function TermsModal({ open, onClose }: TermsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="الشروط والأحكام" icon="gavel">
      <div className="overflow-y-auto space-y-4 text-sm text-secondary leading-relaxed p-2">
        <h4 className="font-bold text-primary">1. القبول بالشروط</h4>
        <p>استخدامك لمنصة بيئيين يعني موافقتك...</p>
        <h4 className="font-bold text-primary">2. التعاقد</h4>
        <p>العقود الإلكترونية تعتبر اتفاقيات ملزمة...</p>
      </div>
    </Modal>
  );
}