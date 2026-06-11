import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { GradeBadge } from '@/components/ui/GradeBadge';

interface AuthLayoutProps {
  children: ReactNode;
}

const TIMELINE_MOMENTS = [
  {
    label: 'CLAIM OPENED',
    detail: 'INR claim · ticket #4821',
    aside: null,
  },
  {
    label: 'IDENTITY MATCHED',
    detail: 'Match grade B · 4 merchants · k≥3',
    aside: 'B' as const,
  },
  {
    label: 'EVIDENCE READY',
    detail: '7 signals · 3 corroborating orders',
    aside: null,
  },
] satisfies Array<{ label: string; detail: string; aside: 'B' | null }>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        {/* Left panel — app tokens, light theme */}
        <div
          className="hidden lg:flex flex-col justify-between px-12 py-10"
          style={{
            background: 'var(--surface-raised)',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          {/* Logo */}
          <UnauthLogo variant="light" size="nav" />

          {/* Timeline sequence */}
          <div className="flex flex-col gap-6 max-w-xs">
            {TIMELINE_MOMENTS.map((moment, i) => (
              <div key={moment.label} className="flex flex-col gap-1">
                <div
                  className="flex items-center gap-2"
                  style={{
                    color: 'var(--ink-tertiary)',
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
                      background: i === 1 ? 'var(--ink-secondary)' : 'var(--border-default)',
                      flexShrink: 0,
                    }}
                  />
                  {moment.label}
                </div>
                <div
                  className="flex items-center gap-2 pl-[14px]"
                  style={{
                    color: 'var(--ink-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                >
                  {moment.detail}
                  {moment.aside !== null && (
                    <GradeBadge grade={moment.aside} size="sm" compact />
                  )}
                </div>
              </div>
            ))}

            {/* Footer line */}
            <p
              style={{
                color: 'var(--ink-tertiary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.06em',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
                marginTop: '4px',
              }}
            >
              No automated decision issued
            </p>
          </div>

          {/* Privacy badge */}
          <PrivacyBadge />
        </div>

        {/* Right panel — form area */}
        <div className="flex flex-col min-h-screen">
          {/* Mobile logo */}
          <div className="flex lg:hidden px-6 pt-6 pb-2">
            <UnauthLogo variant="light" size="nav" />
          </div>

          {/* Form content */}
          <div className="flex flex-1 flex-col justify-center px-6 py-10">
            {children}
          </div>

          {/* Quiet footer */}
          <footer
            className="text-meta flex items-center justify-center gap-4 px-6 py-4"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <Link
              href="/privacy"
              className="text-meta hover:underline"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-meta hover:underline"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Terms
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
