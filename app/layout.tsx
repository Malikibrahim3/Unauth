import type { Metadata } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import SentryInit from '@/components/common/SentryInit';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
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
      className={`${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="font-sans antialiased">
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
