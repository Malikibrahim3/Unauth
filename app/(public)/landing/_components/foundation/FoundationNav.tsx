'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Layers, Menu, X } from 'lucide-react';
import { FL_NAV, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Transparent hero navbar — centred links, glass CTA only on the right.
 */
export default function FoundationNav() {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const onScroll = () => setLight(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className={`${styles.heroNavbar} ${light || open ? styles.heroNavbarLight : ''}`}>
        <div className={styles.heroNavbarInner}>
          <Link href="/landing" aria-label="Unauth home" className={styles.heroNavLogoGroup}>
            <Layers className={styles.heroNavLogoIcon} strokeWidth={2} aria-hidden />
            <span className={styles.heroLogo}>Unauth</span>
          </Link>

          <nav aria-label="Primary" className={styles.heroNavCentre}>
            {FL_NAV.links.map((link) => (
              <a key={link.label} href={link.href} className={styles.heroNavLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className={styles.heroNavRight}>
            <Link href={FL_ROUTES.audit} className={styles.heroNavCta} aria-label={FL_NAV.cta}>
              <span className={styles.heroNavCtaText}>{FL_NAV.cta}</span>
              <span className={styles.heroNavCtaArrow} aria-hidden>
                <ChevronRight size={14} strokeWidth={2.25} />
              </span>
            </Link>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="fl-nav-sheet"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
              className={styles.heroNavMenuBtn}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div id="fl-nav-sheet" className={styles.heroNavSheet}>
          {FL_NAV.links.map((link, i) => (
            <a
              key={link.label}
              ref={i === 0 ? firstLinkRef : undefined}
              href={link.href}
              onClick={() => setOpen(false)}
              className={styles.heroNavSheetLink}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 border-t border-[rgba(255,255,255,0.1)] pt-2">
            <Link
              href={FL_ROUTES.audit}
              onClick={() => setOpen(false)}
              className={`${styles.heroNavCta} w-full`}
            >
              <span className={styles.heroNavCtaText}>{FL_NAV.cta}</span>
              <span className={styles.heroNavCtaArrow} aria-hidden>
                <ChevronRight size={14} strokeWidth={2.25} />
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
