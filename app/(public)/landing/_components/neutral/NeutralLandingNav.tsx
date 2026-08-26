'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { neutralLandingViewModel } from './neutralLandingViewModel';
import styles from './neutralLanding.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function NeutralLandingNav() {
  const { nav, routes } = neutralLandingViewModel;
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    toggleRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const closeMenu = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMenu, open]);

  return (
    <header className={styles.navHeader} data-landing-nav>
      <div className={styles.navShell}>
        <Link href={routes.landing} className={styles.logoLink} aria-label="Unauth home" prefetch={false}>
          <UnauthLogo kind="wordmark" tone="graphite" height={22} priority alt="Unauth" />
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {nav.links.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>{link.label}</a>
          ))}
        </nav>

        <div className={styles.desktopActions}>
          <Link href={routes.login} className={styles.navLink} prefetch={false}>{nav.signIn}</Link>
          <Link href={routes.demo} className={styles.inverseButton} prefetch={false}>{nav.cta}</Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="neutral-mobile-menu"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => (open ? closeMenu() : setOpen(true))}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          className={styles.mobileMenuBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div
            ref={menuRef}
            id="neutral-mobile-menu"
            className={styles.mobileMenu}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <nav aria-label="Mobile navigation" className={styles.mobileNavLinks}>
              {nav.links.map((link) => (
                <a key={link.href} href={link.href} onClick={() => closeMenu(false)}>{link.label}</a>
              ))}
            </nav>
            <div className={styles.mobileActions}>
              <Link href={routes.login} onClick={() => closeMenu(false)} prefetch={false}>{nav.signIn}</Link>
              <Link href={routes.demo} className={styles.inverseButton} onClick={() => closeMenu(false)} prefetch={false}>{nav.cta}</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
