import Link from 'next/link';
import type { ReactNode } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export function PublicShell({
  children,
  navigation,
  actions,
  footer,
  surfaceId,
  busy = false,
}: {
  children: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  surfaceId?: string;
  busy?: boolean;
}) {
  return (
    <div className="grid min-h-dvh grid-rows-[56px_1fr_auto] bg-white text-[#1c1f23]">
      <header className="flex items-center gap-5 border-b border-[#eae8e5] px-6">
        <Link href="/landing" aria-label="Unauth home">
          <UnauthLogo kind="lockup" tone="auto" height={20} priority />
        </Link>
        {navigation ? <nav aria-label="Primary">{navigation}</nav> : null}
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </header>
      <main
        className="grid min-h-[calc(100dvh-112px)] place-items-center p-6"
        data-surface-id={surfaceId}
        data-readiness={busy ? 'loading' : 'terminal-ready'}
        data-terminal-ready={busy ? undefined : 'true'}
        aria-busy={busy || undefined}
      >
        {children}
      </main>
      <footer className="flex items-center justify-between gap-3 border-t border-[#eae8e5] px-6 py-4 text-[10.5px] text-[#6f6a63] [&_nav]:flex [&_nav]:gap-4 [&_a]:text-inherit [&_a]:no-underline">
        {footer ?? (
          <nav aria-label="Legal">
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/data-handling">Data handling</Link>
            <Link href="/legal/dpa">DPA</Link>
          </nav>
        )}
      </footer>
    </div>
  );
}
