import type { Metadata } from 'next';
import { DM_Mono, Inter, Inter_Tight } from 'next/font/google';
import ThemeBootstrap from '@/components/common/ThemeBootstrap';
import ScrollToTop from '@/components/navigation/ScrollToTop';
import './globals.css';
import '../styles/authenticated/index.css';

// Decision Ledger font profiles: Inter for interface and financial text,
// Inter Tight for deliberate public display roles, and DM Mono for machine
// identifiers, keys, code, and payloads only.
// Variable font: no `weight` array, so every weight (including the 550/650
// steps used by the authenticated type ramp) renders as its real value
// instead of snapping to the nearest static instance.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
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
      { url: '/brand/unauth-r1/unauth-r1-favicon-graphite-on-white.svg', type: 'image/svg+xml' },
      { url: '/brand/unauth-r1/generated/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/brand/unauth-r1/generated/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Unauth — Post-Purchase Payout Control',
    description:
      'Post-purchase payout control for Shopify & Gorgias. Unauth surfaces payout exposure, evidence, the matched merchant rule, and recovery — your team makes the decision.',
    images: [{ url: '/brand/unauth-r1/generated/unauth-og-1200x630.png', width: 1200, height: 630, alt: 'Unauth' }],
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
      data-scroll-behavior="smooth"
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
