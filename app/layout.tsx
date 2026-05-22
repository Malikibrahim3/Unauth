import type { Metadata } from 'next';
import { DM_Sans, Geist, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import SentryInit from '@/components/common/SentryInit';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['opsz'],
  style: ['normal', 'italic'],
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
      className={`${geist.variable} ${dmSans.variable} ${ibmPlexMono.variable} ${sourceSerif.variable}`}
    >
      <body className="font-sans antialiased">
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
