'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS, ROUTES } from '../_lib/content';
import Wordmark from './Wordmark';

/**
 * Sticky nav: hairline border appears only after scroll so the hero opens
 * borderless (Ramp pattern). Translucent surface via token color-mix.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-[color-mix(in_srgb,var(--surface-base)_88%,transparent)] backdrop-blur-md transition-[border-color] duration-300 ${
        scrolled || open
          ? 'border-b border-[var(--border-default)]'
          : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[70rem] items-center justify-between px-5 sm:px-8">
        <Link href="/landing" aria-label="Unauth home" className="flex items-center">
          <Wordmark className="text-[1.35rem]" />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={ROUTES.login}
            className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
          >
            Sign in
          </Link>
          <Link
            href={ROUTES.signup}
            className="rounded-[var(--radius-md)] bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-[var(--ink-inverse)] transition-colors hover:bg-[var(--action-primary-hover)]"
          >
            Create a workspace
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-primary)] md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-5 pb-6 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block border-b border-[var(--border-subtle)] py-3.5 text-[0.9375rem] text-[var(--ink-primary)]"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href={ROUTES.signup}
              className="rounded-[var(--radius-md)] bg-[var(--action-primary)] px-4 py-3 text-center text-sm font-medium text-[var(--ink-inverse)]"
            >
              Create a workspace
            </Link>
            <Link
              href={ROUTES.login}
              className="rounded-[var(--radius-md)] border border-[var(--border-default)] px-4 py-3 text-center text-sm font-medium text-[var(--ink-primary)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
