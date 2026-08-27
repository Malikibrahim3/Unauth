import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NeutralLanding } from './_components/neutral/NeutralLanding';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-neutral-landing',
  weight: 'variable',
});

export const metadata: Metadata = {
  title: 'Unauth — The evidence gate before every refund or reship',
  description:
    'Unauth gathers case evidence, applies merchant rules and recommends whether a refund or reship is ready to resolve or needs review.',
  openGraph: {
    title: 'Unauth — The evidence gate before every refund or reship',
    description:
      'Unauth gathers case evidence, applies merchant rules and recommends whether a refund or reship is ready to resolve or needs review.',
  },
  twitter: {
    title: 'Unauth — The evidence gate before every refund or reship',
    description:
      'Unauth gathers case evidence, applies merchant rules and recommends whether a refund or reship is ready to resolve or needs review.',
  },
};

export default function LandingPage() {
  return <div className={inter.variable}><NeutralLanding /></div>;
}
