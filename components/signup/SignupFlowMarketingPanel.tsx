'use client';

import Link from 'next/link';
import { SIGNUP_TEXT_MUTED } from '@/components/signup/signupFlowStyles';

export function SignupFlowMarketingPanel() {
  return (
    <div className="border-b px-6 py-12 md:px-10 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
      <Link href="/" className="inline-block">
        <span className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
          Unauth
        </span>
      </Link>

      <div className="mt-16 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
          Start with connected context
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
          Review claims with the full story.
        </h1>
        <p
          className="mt-5 max-w-[34rem]"
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          Create your account, connect your store and helpdesk, and Unauth will assemble order, ticket,
          evidence, customer, and prior-claim context for your team to review.
        </p>

        <div className="mt-10 space-y-4">
          {[
            'Free, instant access. No approval gate.',
            'Recommendations are explainable and rule-based.',
            'Your team remains responsible for the final claim decision.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
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
