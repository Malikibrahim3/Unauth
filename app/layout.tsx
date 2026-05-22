import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SentryInit from '@/components/common/SentryInit';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'Unauth — Order Identity Review',
  description: 'CSV-based identity match and evidence review tool for ecommerce merchants.',
  icons: {
    icon: [{ url: '/logo-mark.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased bg-[var(--surface-base)] text-[var(--ink-primary)]">
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
