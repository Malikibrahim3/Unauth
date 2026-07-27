'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface AvatarMenuProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

/**
 * AvatarMenu — avatar button right-of-search with dropdown.
 * Items: account settings link + sign-out.
 * Per §5.3 of the Amplitude Core Design Amplification Plan.
 */
export function AvatarMenu({ name, email, className }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = name
    ? name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : email
      ? email.split('@')[0].slice(0, 2).toUpperCase()
      : '?';

  return (
    <div ref={ref} className={cn('relative flex-shrink-0', className)}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full',
          'bg-[var(--ua-action-primary)] text-[var(--ua-text-inverse)]',
          'text-xs font-bold leading-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2',
          'transition-opacity hover:opacity-90',
          'select-none',
        )}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'w-48 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)]',
            'bg-[var(--ua-surface-primary)] shadow-[var(--ua-shadow-overlay)]',
            'py-1',
          )}
        >
          {(name || email) && (
            <div className="px-3 py-2 border-b border-[var(--ua-border-subtle)]">
              {name ? <p className="text-body-sm font-semibold text-[var(--ua-text-primary)] truncate">{name}</p> : null}
              {email ? <p className="text-caption text-[var(--ua-text-secondary)] truncate">{email}</p> : null}
            </div>
          )}

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2',
              'text-body-sm text-[var(--ua-text-primary)]',
              'hover:bg-[var(--ua-surface-secondary)] transition-colors duration-[var(--ua-duration-fast)]',
            )}
          >
            Account settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2',
              'text-body-sm text-[var(--ua-risk-critical)]',
              'hover:bg-[var(--ua-surface-secondary)] transition-colors duration-[var(--ua-duration-fast)]',
            )}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
