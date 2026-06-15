'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Layers, Menu, X } from 'lucide-react';
import { FL_NAV, FL_ROUTES } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

type NavTheme = 'dark' | 'light';

const NAV_PROBE_Y = 38;

function resolveNavTheme(navRoot: HTMLElement | null): NavTheme {
  const x = Math.round(window.innerWidth / 2);
  const y = NAV_PROBE_Y;
  const hit = document.elementFromPoint(x, y);

  if (hit && !navRoot?.contains(hit)) {
    let node = hit as HTMLElement | null;
    while (node) {
      const theme = node.dataset.navTheme;
      if (theme === 'dark' || theme === 'light') return theme;
      node = node.parentElement;
    }
  }

  return 'light';
}

/**
 * Fixed pill navbar — theme follows the section behind it via data-nav-theme.
 */
export default function FoundationNav() {
  const [open, setOpen] = useState(false);
  const [onLightBg, setOnLightBg] = useState(false);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setOnLightBg(resolveNavTheme(pillRef.current) === 'light');
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-nav-theme'] });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
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
      <header className={`${styles.heroNavbar} ${onLightBg || open ? styles.heroNavbarLight : ''}`}>
        <div ref={pillRef} className={styles.heroNavbarPill}>
          <div className={styles.heroNavbarInner}>
            <Link href="/landing" prefetch={false} aria-label="Unauth home" className={styles.heroNavLogoGroup}>
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
              <Link href={FL_ROUTES.login} prefetch={false} className={styles.heroNavSignIn}>
                {FL_NAV.signIn}
              </Link>
              <Link href={FL_ROUTES.audit} prefetch={false} className={styles.heroNavCta} aria-label={FL_NAV.cta}>
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
        </div>
      </header>

      {open ? (
        <div
          id="fl-nav-sheet"
          className={`${styles.heroNavSheet} ${onLightBg ? styles.heroNavSheetLight : ''}`}
        >
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
          <Link
            href={FL_ROUTES.login}
            prefetch={false}
            onClick={() => setOpen(false)}
            className={`${styles.heroNavSheetLink} ${styles.heroNavSheetSignIn}`}
          >
            {FL_NAV.signIn}
          </Link>
          <div className={`mt-2 border-t pt-2 ${onLightBg ? 'border-[rgba(0,0,0,0.08)]' : 'border-[rgba(255,255,255,0.1)]'}`}>
            <Link
              href={FL_ROUTES.audit}
              prefetch={false}
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
