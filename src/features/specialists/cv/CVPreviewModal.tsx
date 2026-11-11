'use client';

import { useRef } from 'react';

import { Modal } from '@/components/ui/Modal';
import { printElement } from '@/lib/print';

import { CVDocument, type CVPreviewData } from './CVDocument';

export type { CVPreviewData } from './CVDocument';

interface CVPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: CVPreviewData;
  /** Organization-facing preview: masks the national ID. */
  asOrganization?: boolean;
}

/** CV preview dialog (specialist self-view and organization-facing view). */
export function CVPreviewModal({ open, onClose, data, asOrganization = false }: CVPreviewModalProps) {
  const docRef = useRef<HTMLElement>(null);

  return (
    <Modal open={open} onClose={onClose} title="السيرة الذاتية" icon="assignment_ind" panelClassName="max-w-2xl">
      <div className="space-y-4 overflow-y-auto pe-1">
        <CVDocument ref={docRef} data={data} asOrganization={asOrganization} />
        <div className="flex justify-end border-t border-line pt-4">
          <button
            type="button"
            onClick={() => docRef.current && printElement(docRef.current)}
            className="btn btn-secondary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">print</span>
            طباعة السيرة
          </button>
        </div>
      </div>
    </Modal>
  );
}
