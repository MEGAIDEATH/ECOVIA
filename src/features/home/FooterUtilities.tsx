'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { TermsModal } from '@/components/modals/TermsModal';
import { DemoSessionResetButton } from '@/features/auth/DemoSessionResetButton';

/**
 * The admin login modal belongs to a separate admin surface: it is lazily
 * loaded and only mounted after an explicit "admin portal" click, so public
 * bundles never contain admin code.
 */
const AdminLoginModal = dynamic(
  () => import('@/components/modals/AdminLoginModal').then((module) => module.AdminLoginModal),
  { ssr: false },
);

const LINK = 'text-[#c2d9cf] underline-offset-4 transition-colors hover:text-white hover:underline';

/** Footer legal links, admin portal entry and the demo-session reset. */
export function FooterUtilities() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={() => setPrivacyOpen(true)} className={LINK}>
          سياسة الخصوصية
        </button>
        <button type="button" onClick={() => setTermsOpen(true)} className={LINK}>
          الشروط والأحكام
        </button>
        <button type="button" onClick={() => setAdminOpen(true)} className={`${LINK} inline-flex items-center gap-1`}>
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
            admin_panel_settings
          </span>
          بوابة الإدارة
        </button>
        <DemoSessionResetButton className={`${LINK} inline-flex items-center gap-1 disabled:opacity-70`} />
      </div>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      {adminOpen && <AdminLoginModal open onClose={() => setAdminOpen(false)} />}
    </>
  );
}

/** Copyright year, always the visitor's current year (page is prerendered). */
export function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
