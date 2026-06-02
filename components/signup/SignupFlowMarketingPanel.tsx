'use client';

import Link from 'next/link';
import { SIGNUP_TEXT_MUTED } from '@/components/signup/signupFlowStyles';

export function SignupFlowMarketingPanel() {
  return (
    <div className="border-b px-6 py-12 md:px-10 lg:border-b-0 lg:border-r" style={{ borderColor: '#D8D0BD' }}>
      <Link href="/" className="inline-block">
        <span className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
          Unauth
        </span>
      </Link>

      <div className="mt-16 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
          Start with your own data
        </p>
        <h1
          className="mt-4"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(34px, 5vw, 58px)',
            fontWeight: 500,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
          }}
        >
          Find out who&apos;s been hitting you.
        </h1>
        <p
          className="mt-5 max-w-[34rem]"
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '18px',
            lineHeight: 1.6,
            color: '#4A4640',
          }}
        >
          Create your account, upload your last 90 days of orders and refunds, and we&apos;ll resolve repeat
          identities and surface their claims history from your store data - then grow into the network.
        </p>

        <div className="mt-10 space-y-4">
          {[
            'Free, instant access. No approval gate.',
            'Audit runs on your data only. No cross-merchant signals at this stage.',
            'Results land in your inbox in around 20 minutes.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: '#7B2D26' }} />
              <p className="text-sm leading-6" style={SIGNUP_TEXT_MUTED}>
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
