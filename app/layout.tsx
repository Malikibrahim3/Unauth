import type { Metadata } from 'next';
import { DM_Mono, Inter, Inter_Tight } from 'next/font/google';
import ThemeBootstrap from '@/components/common/ThemeBootstrap';
import ScrollToTop from '@/components/navigation/ScrollToTop';
import './globals.css';
import '../styles/authenticated/index.css';

// Ramp redesign — Inter is the closest free analog to Ramp's neutral grotesque.
// Loaded into the existing CSS-var names so globals.css needs no font wiring changes:
//   --font-dm-sans  → body / sans (Inter)
//   --font-bricolage → display (Inter Tight, tighter for large headings)
//   --font-dm-mono  → tabular numerals (DM Mono, retained)
// Source Serif is dropped; --font-serif is repointed to the sans in globals.css.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Unauth — Post-Purchase Payout Control',
  description:
    'Post-purchase payout control for Shopify & Gorgias. Unauth surfaces payout exposure, evidence, the matched merchant rule, and recovery — your team makes the decision.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Unauth — Post-Purchase Payout Control',
    description:
      'Post-purchase payout control for Shopify & Gorgias. Unauth surfaces payout exposure, evidence, the matched merchant rule, and recovery — your team makes the decision.',
    images: [{ url: '/logo-wordmark.png', width: 980, height: 212, alt: 'Unauth wordmark' }],
  },
  twitter: {
    title: 'Unauth — Post-Purchase Payout Control',
    description:
      'Post-purchase payout control for Shopify & Gorgias. Unauth surfaces payout exposure, evidence, the matched merchant rule, and recovery — your team makes the decision.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${inter.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeBootstrap />
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
