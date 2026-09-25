'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { TermsModal } from '@/components/modals/TermsModal';
import { Spinner } from '@/components/ui/Spinner';
import { DemoSessionResetButton } from '@/features/auth/DemoSessionResetButton';
import { useDashboardEntry } from '@/features/auth/useDashboardEntry';

const AI_ASSISTANT_URL = 'https://oasis-bay-151.faces.site/w8chr2rnnq3e';
const ASSISTANT_IMAGE =
  'https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
const ASSISTANT_FALLBACK =
  'https://ui-avatars.com/api/?name=مساعد+ذكي&background=005232&color=fff&size=400';

/**
 * The admin login modal belongs to a completely separate admin surface: it is
 * lazily loaded and only mounted after an explicit "admin portal" click, so
 * public bundles never contain admin code.
 */
const AdminLoginModal = dynamic(
  () => import('@/components/modals/AdminLoginModal').then((module) => module.AdminLoginModal),
  { ssr: false },
);

/** Landing view — faithful port of the legacy `view-home`. */
export function HomeView() {
  const { checkAndGoToDashboard, checking } = useDashboardEntry();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [assistantSrc, setAssistantSrc] = useState(ASSISTANT_IMAGE);

  return (
    <main className="flex flex-col min-h-screen relative overflow-x-hidden p-6 transition-opacity duration-300">
      {/* Background: nature image + blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          alt="خلفية الطبيعة"
          fill
          priority
          sizes="100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#f9faf5]/85 backdrop-blur-sm" />
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-fixed rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000" />
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 right-6 md:top-8 md:left-12 md:right-12 z-20 flex items-center justify-between fade-up">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-4xl shadow-sm rounded-full bg-white/50 p-1 backdrop-blur-md">
            eco
          </span>
          <span className="text-primary text-2xl font-bold tracking-tight">بيئيين</span>
        </div>
        <button
          type="button"
          onClick={() => void checkAndGoToDashboard()}
          disabled={checking}
          className="flex items-center gap-2 bg-white/80 hover:bg-white text-primary px-4 py-2 rounded-full font-bold shadow-md backdrop-blur-md transition-all border border-white/50 hover:scale-105 disabled:opacity-70"
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
          الدخول لحسابي
          {checking && <Spinner className="w-4 h-4 border-2" />}
        </button>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-4xl mx-auto py-12 mt-12 md:mt-0">
        <div className="text-center mb-12 flex flex-col items-center">
          <a
            href={AI_ASSISTANT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-block transition-transform duration-300 hover:scale-105 mb-4 hero-animation fade-up"
            style={{ animationDelay: '1.6s' }}
          >
            <Image
              src={assistantSrc}
              alt="المساعد الذكي"
              width={160}
              height={160}
              onError={() => {
                if (assistantSrc !== ASSISTANT_FALLBACK) setAssistantSrc(ASSISTANT_FALLBACK);
              }}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-2xl border-4 border-white group-hover:border-primary-fixed transition-colors"
            />
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white text-sm font-bold py-1.5 px-6 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1 group-hover:bg-[#006d44] transition-colors">
              المساعد الذكي{' '}
              <span className="material-symbols-outlined text-sm">ads_click</span>
            </div>
          </a>
          <h2
            className="text-3xl md:text-5xl font-bold text-primary mt-6 mb-4 drop-shadow-sm fade-up"
            style={{ animationDelay: '1.8s' }}
          >
            منصة بيئيين
          </h2>
          <p className="text-secondary text-lg max-w-lg font-medium bg-white/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/50 shadow-sm fade-up">
            الرجاء تحديد نوع الحساب للمتابعة وإتمام عملية الدخول أو التسجيل.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-3xl">
          <Link
            href="/register/specialist/step-1"
            className="group relative bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-3xl border-2 border-white/60 hover:border-primary shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center overflow-hidden hover:-translate-y-2 fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
              <span className="material-symbols-outlined text-3xl md:text-4xl">
                person_search
              </span>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-on-surface mb-2 md:mb-3 group-hover:text-primary transition-colors">
              أخصائي بيئي
            </h3>
            <p className="text-secondary text-sm md:text-base mb-6 md:mb-8 leading-relaxed font-medium">
              للأفراد والمتخصصين في المجال البيئي لتوثيق أعمالهم والوصول إلى الأرشيف.
            </p>
            <div className="mt-auto inline-flex items-center gap-1 md:gap-2 text-primary font-bold group-hover:gap-2 md:group-hover:gap-3 transition-all text-sm md:text-base bg-white/50 px-4 py-2 rounded-full">
              دخول كأخصائي{' '}
              <span className="material-symbols-outlined rotate-180 text-base md:text-lg">
                arrow_right_alt
              </span>
            </div>
          </Link>

          <Link
            href="/register/organization"
            className="group relative bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-3xl border-2 border-white/60 hover:border-primary shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center overflow-hidden hover:-translate-y-2 fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
              <span className="material-symbols-outlined text-3xl md:text-4xl">domain</span>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-on-surface mb-2 md:mb-3 group-hover:text-primary transition-colors">
              جهة / مؤسسة
            </h3>
            <p className="text-secondary text-sm md:text-base mb-6 md:mb-8 leading-relaxed font-medium">
              للشركات والمؤسسات لإدارة المشاريع واستعراض الكفاءات والمواهب.
            </p>
            <div className="mt-auto inline-flex items-center gap-1 md:gap-2 text-primary font-bold group-hover:gap-2 md:group-hover:gap-3 transition-all text-sm md:text-base bg-white/50 px-4 py-2 rounded-full">
              دخول كجهة{' '}
              <span className="material-symbols-outlined rotate-180 text-base md:text-lg">
                arrow_right_alt
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full z-10 text-center text-secondary text-sm mt-auto pt-4 font-medium backdrop-blur-sm bg-white/30 py-4 rounded-t-2xl fade-up flex flex-col items-center gap-2">
        <p>© بيئيين ٢٠٢٦. جميع الحقوق محفوظة.</p>
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="text-primary hover:underline font-bold"
          >
            سياسة الخصوصية
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="text-primary hover:underline font-bold"
          >
            الشروط والأحكام
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="text-xs text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>{' '}
          بوابة الإدارة
        </button>
        <DemoSessionResetButton />
      </footer>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      {adminOpen && (
        <AdminLoginModal open onClose={() => setAdminOpen(false)} />
      )}
    </main>
  );
}
