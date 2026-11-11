'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/ui/Feedback';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { getPublicSpecialist } from '@/features/directory/directoryService';
import { CVDocument } from '@/features/specialists/cv/CVDocument';
import { printElement } from '@/lib/print';
import { toCvPreviewData } from '@/lib/utils/cv';
import type { PublicSpecialist } from '@/types';

import { useContactSpecialist } from './useContactSpecialist';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; specialist: PublicSpecialist };

/** Organization-facing professional profile with the specialist's CV document. */
export function SpecialistProfile() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const { contact, contacting } = useContactSpecialist();
  const docRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    getPublicSpecialist(params.id)
      .then((specialist) => {
        if (active) setState({ status: 'ready', specialist });
      })
      .catch((error: unknown) => {
        if (active)
          setState({ status: 'error', message: error instanceof Error ? error.message : 'تعذر تحميل الملف المهني.' });
      });
    return () => {
      active = false;
    };
  }, [params?.id]);

  const specialist = state.status === 'ready' ? state.specialist : null;

  return (
    <div className="fade-up">
      <PageHeader
        title={specialist?.fullName || 'الملف المهني'}
        description={specialist ? specialist.edu || 'لم يحدد التخصص' : undefined}
        back={{ href: '/organization/specialists', label: 'دليل الكفاءات' }}
        actions={
          specialist && (
            <>
              <button
                type="button"
                onClick={() => docRef.current && printElement(docRef.current)}
                className="btn btn-secondary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">print</span>
                طباعة السيرة
              </button>
              <LoadingButton
                loading={contacting}
                loadingLabel="جاري..."
                onClick={() => void contact(specialist.userId)}
                className="btn btn-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chat</span>
                تواصل
              </LoadingButton>
            </>
          )
        }
      />
      {state.status === 'loading' && <LoadingState message="جاري تحميل الملف المهني..." />}
      {state.status === 'error' && <ErrorState message={state.message} />}
      {specialist && (
        <div className="card max-w-3xl p-5 md:p-7">
          {!specialist.resumeFileId && (
            <p className="alert alert-info mb-4">لم يرفق هذا الأخصائي ملف سيرة ذاتية بعد.</p>
          )}
          <CVDocument ref={docRef} data={toCvPreviewData(specialist)} asOrganization resumeOpen />
        </div>
      )}
    </div>
  );
}
