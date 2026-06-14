import Link from 'next/link';
import Wordmark from '../Wordmark';
import { FL_FOOTER } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/** Light footer: link columns over a hairline, oversized wordmark beneath. */
export default function FoundationFooter() {
  return (
    <footer data-nav-theme="light" id="privacy" className="bg-[var(--fl-bg)]">
      <div className="mx-auto w-full max-w-[100rem] px-5 pb-12 pt-20 sm:px-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_repeat(3,0.6fr)]">
          <p className="max-w-[20rem] text-[0.9375rem] leading-[1.6] text-[var(--fl-ink-secondary)]">
            {FL_FOOTER.tagline}
          </p>
          {FL_FOOTER.columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-[var(--fl-ink-tertiary)]">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) =>
                  link.href.startsWith('#') ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[0.9375rem] text-[var(--fl-ink-secondary)] transition-colors hover:text-[var(--fl-ink)]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[0.9375rem] text-[var(--fl-ink-secondary)] transition-colors hover:text-[var(--fl-ink)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-20 border-t border-[var(--fl-line)] pt-10">
          <Wordmark
            tone="light"
            className={styles.footerWordmark}
          />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-xs text-[var(--fl-ink-tertiary)]">{FL_FOOTER.legal}</p>
            <p className="font-mono text-xs text-[var(--fl-ink-tertiary)]">
              © {new Date().getFullYear()} Unauth
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
