import type { Metadata } from 'next';
import { DM_Mono, DM_Sans, Source_Serif_4 } from 'next/font/google';
import SentryInit from '@/components/common/SentryInit';
import ThemeBootstrap from '@/components/common/ThemeBootstrap';
import 'reactflow/dist/style.css';
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

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['opsz'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Unauth — Order Identity Review',
  description: 'CSV-based identity match and evidence review tool for ecommerce merchants.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Unauth — Order Identity Review',
    description: 'CSV-based identity match and evidence review tool for ecommerce merchants.',
    images: [{ url: '/logo-wordmark.png', width: 980, height: 212, alt: 'Unauth wordmark' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeBootstrap />
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
