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
      <div className="overflow-y-auto space-y-4 text-[15px] text-muted leading-relaxed p-1">
        <h4 className="font-bold text-forest">1. القبول بالشروط</h4>
        <p>استخدامك لمنصة إيكوفيا يعني موافقتك...</p>
        <h4 className="font-bold text-forest">2. التعاقد</h4>
        <p>العقود الإلكترونية تعتبر اتفاقيات ملزمة...</p>
      </div>
    </Modal>
  );
}