import type { Metadata } from 'next';
import { DM_Mono, Inter, Inter_Tight } from 'next/font/google';
import ThemeBootstrap from '@/components/common/ThemeBootstrap';
import ScrollToTop from '@/components/navigation/ScrollToTop';
import { RouteReadySignal } from '@/components/system/RouteReadySignal';
import { Suspense } from 'react';
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

function validatedCaptureNow(): string | null {
  const raw = process.env.UNAUTH_CLOCK_AS_OF?.trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error('UNAUTH_CLOCK_AS_OF must be a valid ISO-8601 instant.');
  }
  return new Date(parsed).toISOString();
}

/** §7.7: capture mode and its clock are installed while HTML is parsed. */
function CaptureModeBootstrap({ captureNow }: { captureNow: string | null }) {
  const source = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('unauth.theme');if(t==='dark'||t==='light'){r.setAttribute('data-theme',t);}if(/(?:^|[?&])capture=1(?:&|$)/.test(window.location.search)){r.setAttribute('data-capture-mode','true');globalThis.__UNAUTH_CAPTURE_PENDING_RESOURCES__=0;var f=globalThis.fetch.bind(globalThis);globalThis.fetch=function(){globalThis.__UNAUTH_CAPTURE_PENDING_RESOURCES__++;return f.apply(globalThis,arguments).finally(function(){globalThis.__UNAUTH_CAPTURE_PENDING_RESOURCES__=Math.max(0,globalThis.__UNAUTH_CAPTURE_PENDING_RESOURCES__-1);});};var n=${JSON.stringify(captureNow)};if(n){var m=Date.parse(n);if(Number.isFinite(m)){globalThis.__UNAUTH_CAPTURE_NOW__=m;r.setAttribute('data-capture-clock','frozen');r.setAttribute('data-capture-now',new Date(m).toISOString());}else{r.setAttribute('data-capture-clock','invalid');}}else{r.setAttribute('data-capture-clock','missing');}}}catch(e){document.documentElement.setAttribute('data-capture-clock','invalid');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}

/** Server/client clock boundary used by every capture-mode route. */
function CaptureClockProvider() {
  return <CaptureModeBootstrap captureNow={validatedCaptureNow()} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${interTight.variable} ${inter.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <CaptureClockProvider />
        <ThemeBootstrap />
        <ScrollToTop />
        <Suspense fallback={null}>
          <RouteReadySignal />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
