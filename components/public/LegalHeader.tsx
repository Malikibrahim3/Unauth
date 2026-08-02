import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import styles from './legalDocument.module.css';

const LEGAL_LINKS = [
  { href: '/legal/data-handling', label: 'Data handling' },
  { href: '/legal/dpa', label: 'DPA' },
  { href: '/legal/pilot-terms', label: 'Pilot terms' },
  { href: '/legal/privacy', label: 'Privacy' },
] as const;

export function LegalHeader({ currentPath }: { currentPath: string }) {
  return (
    <>
      <a className={styles.skipLink} href="#main-content">Skip to document</a>
      <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/landing" aria-label="Unauth home" className={styles.brand}>
          <UnauthLogo kind="lockup" tone="graphite" height={22} alt="" decorative />
        </Link>
        <nav aria-label="Legal documents" className={styles.headerNav}>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={currentPath === link.href ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/landing">Home</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
      </header>
    </>
  );
}
