'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { FL_NAV, FL_ROUTES } from '../../_lib/foundationContent';

/**
 * Two-layer nav, per the reference: the wordmark + account CTAs sit at the
 * top of the hero and scroll away with it, while the centered glass pill
 * stays fixed and floats over every section. Links collapse into a menu
 * sheet below lg (the full pill + hero CTAs don't both fit at tablet
 * widths). The sheet closes on Escape and moves focus into itself on open.
 */
export default function FoundationNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

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
      <div className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
        <nav
          aria-label="Primary"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--fl-glass-line-faint)] bg-[var(--fl-nav-bg)] p-1.5 shadow-[0_1px_3px_rgba(10,14,18,0.25)] backdrop-blur-xl backdrop-saturate-150"
        >
          <div className="hidden items-center lg:flex">
            {FL_NAV.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-[0.9375rem] font-medium text-[var(--fl-nav-ink-dim)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--fl-nav-ink)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <span className="px-4 py-2 text-[0.9375rem] font-semibold text-[var(--fl-nav-ink)]">
              Menu
            </span>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="fl-nav-sheet"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] text-[var(--fl-nav-ink)]"
            >
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </nav>
      </div>

      {open ? (
        <div
          id="fl-nav-sheet"
          className="fixed inset-x-4 top-[4.75rem] z-50 rounded-2xl border border-[var(--fl-glass-line-faint)] bg-[rgba(22,26,30,0.96)] p-3 shadow-[0_24px_64px_-16px_rgba(10,14,18,0.6)] backdrop-blur-xl lg:hidden"
        >
          {FL_NAV.links.map((link, i) => (
            <a
              key={link.label}
              ref={i === 0 ? firstLinkRef : undefined}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3.5 text-[1.0625rem] font-medium text-[var(--fl-nav-ink)] transition-colors hover:bg-[rgba(255,255,255,0.07)]"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--fl-glass-line-faint)] pt-3">
            <Link
              href={FL_ROUTES.login}
              className="rounded-full border border-[var(--fl-glass-line)] px-4 py-3 text-center text-[0.9375rem] font-medium text-[var(--fl-nav-ink)]"
            >
              {FL_NAV.signIn}
            </Link>
            <Link
              href={FL_ROUTES.audit}
              className="rounded-full bg-[var(--fl-paper)] px-4 py-3 text-center text-[0.9375rem] font-semibold text-[var(--fl-ink)]"
            >
              {FL_NAV.cta}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
