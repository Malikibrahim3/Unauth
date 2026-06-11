import Link from 'next/link';
import Wordmark from '../Wordmark';
import { FL_FOOTER } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/** Dark footer: link columns over a hairline, oversized wordmark beneath. */
export default function FoundationFooter() {
  return (
    <footer id="privacy" className="bg-[var(--fl-dark-card)]">
      <div className="mx-auto w-full max-w-[100rem] px-5 pb-12 pt-20 sm:px-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_repeat(3,0.6fr)]">
          <p className="max-w-[20rem] text-[0.9375rem] leading-[1.6] text-[rgba(251,251,250,0.6)]">
            {FL_FOOTER.tagline}
          </p>
          {FL_FOOTER.columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-[rgba(251,251,250,0.45)]">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) =>
                  link.href.startsWith('#') ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[0.9375rem] text-[rgba(251,251,250,0.78)] transition-colors hover:text-[var(--fl-on-color)]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[0.9375rem] text-[rgba(251,251,250,0.78)] transition-colors hover:text-[var(--fl-on-color)]"
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

        <div className="mt-20 border-t border-[rgba(251,251,250,0.14)] pt-10">
          <Wordmark
            tone="dark"
            className={styles.footerWordmark}
          />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-xs text-[rgba(251,251,250,0.45)]">{FL_FOOTER.legal}</p>
            <p className="font-mono text-xs text-[rgba(251,251,250,0.45)]">
              © {new Date().getFullYear()} Unauth
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
