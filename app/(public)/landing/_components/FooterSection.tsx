import Link from 'next/link';
import { FOOTER } from '../_lib/content';
import Wordmark from './Wordmark';

/**
 * Minimal footer — continues the graphite closer so page ends in one block.
 */
export default function FooterSection() {
  return (
    <footer className="border-t border-[var(--landing-graphite-2)] bg-[var(--landing-graphite)]">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:gap-20">
          <div>
            <Wordmark tone="dark" className="text-xl" />
            <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-[color-mix(in_srgb,var(--ink-inverse)_55%,transparent)]">
              {FOOTER.tagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
            {FOOTER.columns.map((column) => (
              <div key={column.heading}>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--ink-inverse)_45%,transparent)]">
                  {column.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a
                          href={link.href}
                          className="text-sm text-[color-mix(in_srgb,var(--ink-inverse)_70%,transparent)] transition-colors hover:text-[var(--ink-inverse)]"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-[color-mix(in_srgb,var(--ink-inverse)_70%,transparent)] transition-colors hover:text-[var(--ink-inverse)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--landing-graphite-2)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-[color-mix(in_srgb,var(--ink-inverse)_40%,transparent)]">
            © {new Date().getFullYear()} Unauth
          </p>
          <p className="font-mono text-xs text-[color-mix(in_srgb,var(--ink-inverse)_40%,transparent)]">
            {FOOTER.legal}
          </p>
        </div>
      </div>
    </footer>
  );
}
