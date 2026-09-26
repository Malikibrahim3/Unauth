import type { Metadata } from 'next';
import { PublicNav, PublicFooter } from '@/components/public/PublicUI';
import { LandingNavigation } from '@/components/public/PublicInteractions';
import { LandingCanvasBody } from '@/components/public/LandingCanvasBody';
import styles from '@/components/public/public.module.css';

const headline = 'Your rules before money moves. Recover what you’re owed.';
const description = 'Orders that never arrive. Customers demanding refunds. Carrier claims left unpaid. Unauth decides the outcome under your rules and keeps recovery moving.';
export const metadata: Metadata = {
  title: headline + ' | Unauth', description,
  openGraph: { title: headline, description, images: [{ url: '/brand/unauth-r1/generated/unauth-og-1200x630.png', width: 1200, height: 630, alt: 'Unauth — refund control and eligible recovery' }] }, twitter: { card: 'summary_large_image', title: headline, description, images: ['/brand/unauth-r1/generated/unauth-og-1200x630.png'] },
};

export default function LandingPage() {
  return <div className={`${styles.root} ${styles.landing}`} data-landing-page data-surface-id="marketing-landing" data-screen-label="Landing">
    <noscript><style>{`
      [hidden]:has(> [data-landing-page]) { display:block !important; }
      body:has([data-landing-page]) [data-public-root]:has([data-state-id="public-route-loading"]) { display:none; }
    `}</style></noscript>
    <LandingNavigation><PublicNav landing /></LandingNavigation>
    <main id="public-content" tabIndex={-1}>
      <LandingCanvasBody />
    </main>
    <PublicFooter landing />
  </div>;
}
