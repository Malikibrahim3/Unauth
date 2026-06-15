import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { FL_HERO, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Hero CTA bar — anchored to the top of the scroll curtain, shifted up by
 * its own height so it sits on the hero’s bottom-left without pulling the
 * second section into view. Scrolls naturally with the curtain.
 */
export default function FoundationHeroCta() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 -translate-y-full">
      <Link
        href={FL_ROUTES.audit}
        prefetch={false}
        className={`${styles.ctaBar} pointer-events-auto flex w-full items-center justify-between gap-5 bg-[var(--fl-dusk-2)] px-7 py-5 text-[1.375rem] font-medium text-[var(--fl-on-color)] transition-colors hover:bg-[var(--fl-dusk-1)] sm:inline-flex sm:w-auto sm:min-w-[28.6rem] sm:px-8 sm:text-[1.4375rem]`}
      >
        {FL_HERO.pinnedCta}
        <ArrowUpRight size={26} aria-hidden className="shrink-0" />
      </Link>
    </div>
  );
}
