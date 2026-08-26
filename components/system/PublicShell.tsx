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
    <div className="ua-public-shell">
      <header className="ua-public-shell__header">
        <Link href="/landing" aria-label="Unauth home">
          <UnauthLogo kind="lockup" tone="auto" height={20} priority />
        </Link>
        {navigation ? <nav aria-label="Primary">{navigation}</nav> : null}
        {actions ? <div className="ua-public-shell__actions">{actions}</div> : null}
      </header>
      <main
        className="ua-public-shell__main"
        data-surface-id={surfaceId}
        data-readiness={busy ? 'loading' : 'terminal-ready'}
        data-terminal-ready={busy ? undefined : 'true'}
        aria-busy={busy || undefined}
      >
        {children}
      </main>
      <footer className="ua-public-shell__footer">
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
