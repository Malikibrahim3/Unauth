import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './legalDocument.module.css';

export type LegalContentsItem = {
  href: string;
  label: string;
};

type LegalDocumentProps = {
  title: string;
  summary?: string;
  updated?: string;
  contents: readonly LegalContentsItem[];
  children: ReactNode;
};

const LEGAL_LINKS = [
  { href: '/legal/data-handling', label: 'Data handling' },
  { href: '/legal/dpa', label: 'Data processing agreement' },
  { href: '/legal/pilot-terms', label: 'Pilot terms' },
  { href: '/legal/privacy', label: 'Privacy policy' },
] as const;

/**
 * Shared editorial anatomy for the public legal routes. It deliberately uses
 * public-site tokens only: legal pages are documents, not product surfaces.
 */
export function LegalDocument({ title, summary, updated, contents, children }: LegalDocumentProps) {
  return (
    <main id="main-content" className={styles.document} tabIndex={-1}>
      <div className={styles.intro}>
        <h1>{title}</h1>
        {summary ? <p className={styles.summary}>{summary}</p> : null}
        {updated ? <p className={styles.updated}>{updated}</p> : null}
      </div>

      <div className={styles.contentGrid}>
        <nav className={styles.contents} aria-label="On this page">
          <p>On this page</p>
          <ol>
            {contents.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.article}>{children}</article>
      </div>

      <footer className={styles.footer}>
        <p>Related legal documents</p>
        <nav aria-label="Related legal documents">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}
