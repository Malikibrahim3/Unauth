import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[var(--fl-bg)] text-[var(--fl-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 py-6 sm:px-6">
        <Link href="/" className="mb-12 inline-flex w-fit">
          <UnauthLogo variant="light" size="nav" />
        </Link>
        <div className="flex flex-1 flex-col justify-center pb-12">{children}</div>
      </div>
    </main>
  );
}

export function AuthError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;

  return (
    <p id={id} className="mt-2 text-sm leading-5 text-[var(--risk-critical-fg)]">
      {children}
    </p>
  );
}

export const authInputClassName =
  'h-12 rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--surface)] px-3.5 text-[16px] text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:ring-[var(--shadow-focus)]';

export const authButtonStyle = {
  background: 'var(--accent)',
  color: '#FFFFFF',
  borderColor: 'var(--accent)',
  borderRadius: 'var(--radius-full)',
  boxShadow: 'var(--landing-shadow-cta)',
} as const;
