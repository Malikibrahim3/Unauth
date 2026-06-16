import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { GradeBadge } from '@/components/ui/GradeBadge';
import foundation from '@/app/(public)/landing/_components/foundation/foundation.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

const NETWORK_STATS = [
  { value: '4 merchants', label: 'corroborated this identity', source: 'Network · k≥3 anonymity' },
  { value: '7 signals', label: 'matched across the cohort', source: 'Device · card · address' },
  { value: 'Grade B', label: 'confidence, not a verdict', source: 'You decide the outcome' },
] as const;

const TIMELINE_MOMENTS = [
  { label: 'CLAIM OPENED', detail: 'INR claim · ticket #4821', aside: null },
  { label: 'IDENTITY MATCHED', detail: 'Match grade B · 4 merchants · k≥3', aside: 'B' as const },
  { label: 'EVIDENCE READY', detail: '7 signals · 3 corroborating orders', aside: null },
] satisfies Array<{ label: string; detail: string; aside: 'B' | null }>;

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
            <p className={foundation.landingSectionEyebrow}>Claim intelligence</p>
            <h2 className={foundation.networkHeroHeading} style={{ marginTop: '1rem' }}>
              One ticket, the whole picture.
            </h2>
            <p className={foundation.landingSectionLead} style={{ maxWidth: '38ch' }}>
              The same network signals that power Unauth, the moment you sign in — evidence your
              support and disputes team can act on.
            </p>

            {/* Network stat artifact — reused from the landing network hero */}
            <div className="mt-9">
              {NETWORK_STATS.map((stat) => (
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
                    {moment.aside !== null && <GradeBadge grade={moment.aside} size="sm" compact />}
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
