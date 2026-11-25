import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { SplashScreen } from '@/components/layout/SplashScreen';
import { ToastProvider } from '@/components/ui/Toast';

import './globals.css';

const DESCRIPTION =
  'إيكوفيا منصة سعودية تربط المنشآت بالأخصائيين البيئيين وتجمع الخدمات المهنية والتوعية البيئية في مكان واحد.';

function siteUrl(): URL | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    return new URL(host ? `https://${host}` : (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'));
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: 'إيكوفيا | الخدمات البيئية والوعي المجتمعي',
    template: '%s | إيكوفيا',
  },
  description: DESCRIPTION,
  applicationName: 'ECOVIA — إيكوفيا',
  icons: { icon: '/assets/ecovia-logo.png' },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    siteName: 'إيكوفيا',
    title: 'إيكوفيا | الخدمات البيئية والوعي المجتمعي',
    description: DESCRIPTION,
    images: [{ url: '/assets/ecovia-logo.png', width: 207, height: 198, alt: 'شعار إيكوفيا' }],
  },
  twitter: { card: 'summary', title: 'إيكوفيا', description: DESCRIPTION },
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
