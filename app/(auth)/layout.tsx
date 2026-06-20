import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import foundation from '@/app/(public)/landing/_components/foundation/foundation.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

const PAYOUT_STATS = [
  { value: '$428', label: 'payout exposure', source: 'Order · refund · reship' },
  { value: '3 gaps', label: 'evidence still needed', source: 'Tracking · photos · ticket' },
  { value: '1 route', label: 'recovery opportunity', source: 'Carrier claim review' },
] as const;

const TIMELINE_MOMENTS = [
  { label: 'CASE OPENED', detail: 'INR ticket #4821 · refund requested' },
  { label: 'POLICY CHECKED', detail: 'Merchant rule matched · evidence missing' },
  { label: 'RECOVERY ROUTED', detail: 'Carrier claim review · agent decides' },
] as const;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-base)' }}>
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        {/* Left panel — editorial continuation of the landing artifacts */}
        <div
          className="relative hidden lg:flex flex-col justify-between px-14 py-12"
          style={{ background: 'var(--surface-raised)', borderRight: '1px solid var(--border)' }}
        >
          <UnauthLogo variant="light" size="nav" />

          <div className="max-w-[440px]">
            <p className={foundation.landingSectionEyebrow}>Payout control</p>
            <h2 className={foundation.networkHeroHeading} style={{ marginTop: '1rem' }}>
              One ticket, the whole picture.
            </h2>
            <p className={foundation.landingSectionLead} style={{ maxWidth: '38ch' }}>
              Payout exposure, evidence gaps, merchant rules, and recovery routes for the support
              cases your team is already handling.
            </p>

            <div className="mt-9">
              {PAYOUT_STATS.map((stat) => (
                <div key={stat.value} className={foundation.networkStatRow}>
                  <div className={foundation.networkStatValue}>{stat.value}</div>
                  <div className={foundation.networkStatLabel}>{stat.label}</div>
                  <div className={foundation.networkStatSource}>{stat.source}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence timeline + privacy footing */}
          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-4 max-w-xs">
              {TIMELINE_MOMENTS.map((moment, i) => (
                <div key={moment.label} className="flex flex-col gap-1">
                  <div
                    className="flex items-center gap-2"
                    style={{
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: i === 1 ? 'var(--accent)' : 'var(--border)',
                        flexShrink: 0,
                      }}
                    />
                    {moment.label}
                  </div>
                  <div
                    className="flex items-center gap-2 pl-[14px]"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  >
                    {moment.detail}
                  </div>
                </div>
              ))}
            </div>
            <PrivacyBadge />
          </div>
        </div>

        {/* Right panel — form area on warm paper */}
        <div className="flex flex-col min-h-screen" style={{ background: 'var(--surface)' }}>
          <div className="flex lg:hidden px-6 pt-6 pb-2">
            <UnauthLogo variant="light" size="nav" />
          </div>

          <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12">{children}</div>

          <footer
            className="flex items-center justify-center gap-4 px-6 py-5"
            style={{ color: 'var(--text-tertiary)', fontSize: '12px', borderTop: '1px solid var(--border)' }}
          >
            <Link href="/privacy" className="hover:underline" style={{ color: 'var(--text-tertiary)' }}>
              Privacy
            </Link>
            <span aria-hidden style={{ opacity: 0.5 }}>·</span>
            <Link href="/terms" className="hover:underline" style={{ color: 'var(--text-tertiary)' }}>
              Terms
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
