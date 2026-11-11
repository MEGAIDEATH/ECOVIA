import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { SplashScreen } from '@/components/layout/SplashScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'إيكوفيا | الخدمات البيئية والوعي المجتمعي',
    template: '%s | إيكوفيا',
  },
  description:
    'إيكوفيا منصة سعودية تربط المنشآت بالأخصائيين البيئيين وتجمع الخدمات المهنية والتوعية البيئية في مكان واحد.',
  icons: { icon: '/assets/ecovia-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#0F3D36',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden antialiased">
        <SplashScreen />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
