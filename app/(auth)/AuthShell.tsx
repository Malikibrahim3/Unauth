import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="ua-auth-surface min-h-screen bg-[var(--ua-canvas)] text-[var(--ua-text-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 py-6 sm:px-6">
        <Link href="/" className="mb-8 inline-flex w-fit">
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
    <p id={id} className="mt-2 text-sm leading-5 text-[var(--ua-risk-critical)]">
      {children}
    </p>
  );
}

export const authInputClassName =
  'h-9 rounded-[var(--ua-radius-control)] border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 text-sm text-[var(--ua-text-primary)] shadow-none placeholder:text-[var(--ua-text-tertiary)] focus:border-[var(--ua-action-primary)] focus:bg-[var(--ua-surface-primary)] focus:ring-[var(--ua-shadow-focus)]';

export const authButtonStyle = {
  background: 'var(--ua-action-primary)',
  color: 'var(--ua-action-primary-fg)',
  borderColor: 'var(--ua-action-primary)',
  borderRadius: 'var(--ua-radius-control)',
  boxShadow: 'none',
} as const;
