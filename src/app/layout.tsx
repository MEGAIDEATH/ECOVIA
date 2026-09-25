import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SplashScreen } from '@/components/layout/SplashScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'منصة بيئيين - النظام المتكامل',
  description:
    'منصة بيئيين تربط الأخصائيين البيئيين بالمنشآت المعتمدة لإدارة المشاريع والعقود والتواصل الآمن.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="text-on-surface antialiased overflow-x-hidden min-h-screen relative">
        {/* Legacy font loading (IBM Plex Sans Arabic, Manrope, Material Symbols) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <SplashScreen />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
