import type { Metadata } from 'next';
import ScrollToTop from '@/components/navigation/ScrollToTop';
import './globals.css';

// Dashboard Design Challenge 6 specifies Instrument Sans for interface text
// and JetBrains Mono for machine-readable identifiers. The bundled font
// boundary is build-time only; product surfaces do not request Google Fonts
// from the browser at runtime.
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
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
