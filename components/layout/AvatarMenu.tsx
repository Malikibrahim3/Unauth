'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DURATION } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';

interface AvatarMenuProps {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  workspaceName?: string | null;
}

/**
 * AvatarMenu — avatar button right-of-search with dropdown.
 * Items: account settings link + sign-out.
 * Per §5.3 of the Amplitude Core Design Amplification Plan; presence per §7.3.
 */
export function AvatarMenu({ name, email, role, workspaceName }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { mounted, phase, containerRef, motionAllowed } = useOverlayPresence({
    open,
    onClose: () => setOpen(false),
    exitDurationMs: DURATION.fast,
    closeOnOutsideClick: true,
    restoreFocus: true,
    transient: true,
  });

  useEffect(() => {
    if (phase !== 'open') return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [phase]);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      setError('Sign out failed. Your session is still active; try again.');
      setBusy(false);
      return;
    }
    setOpen(false);
    router.replace('/login');
    router.refresh();
  }

  function moveMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    if (!items.length) return;
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLElement));
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  const initials = name
    ? name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : email
      ? email.split('@')[0].slice(0, 2).toUpperCase()
      : '?';

  const isOpen = phase === 'open';

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      style={{ position: 'relative', flexShrink: 0, borderTop: '1px solid #e4e3e0', padding: '11px 14px' }}
    >
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', minHeight: 36, display: 'flex', alignItems: 'center', gap: 9, border: 0, background: 'transparent', padding: 0, textAlign: 'left', color: '#1c1f23', cursor: 'pointer' }}
      >
        <span aria-hidden="true" style={{ width: 25, height: 25, flex: '0 0 25px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#9f4f08', color: '#fff', fontSize: 10, fontWeight: 700 }}>{initials}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}>{name?.trim() || email || 'Workspace member'}</span>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', fontSize: 10 }}>{role || 'Workspace access'}</span>
        </span>
        <span aria-hidden="true" style={{ color: '#8a8782', fontSize: 16, lineHeight: 1 }}>⋯</span>
      </button>

      {mounted && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account and session"
          aria-hidden={phase === 'exiting' ? true : undefined}
          onKeyDown={moveMenuFocus}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(100% + 4px)',
            zIndex: 50,
            width: 256,
            padding: '4px 0',
            border: '1px solid #e4e3e0',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 12px 30px rgba(28,27,25,.12)',
            opacity: isOpen ? 1 : 0,
            transform: `translateY(${isOpen ? 0 : 2}px)`,
            transition: motionAllowed ? `opacity ${DURATION.fast}ms ease, transform ${DURATION.fast}ms ease` : 'none',
            pointerEvents: phase === 'exiting' ? 'none' : undefined,
          }}
        >
          {(name || email) && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #eae8e5' }}>
              {name ? <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>{name}</p> : null}
              {email ? <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', fontSize: 11, lineHeight: 1.45 }}>{email}</p> : null}
              {workspaceName ? <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', fontSize: 11, lineHeight: 1.45 }}>{workspaceName} · {role || 'Workspace access'}</p> : null}
            </div>
          )}

          <Link
            href="/settings/workspace/account"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '8px 12px', color: '#1c1f23', fontSize: 12, lineHeight: 1.45, textDecoration: 'none', transition: 'background 120ms ease' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = '#f4f3f1'; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
          >
            Account settings
          </Link>

          <Link
            href="/settings/product/notifications"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '8px 12px', color: '#1c1f23', fontSize: 12, lineHeight: 1.45, textDecoration: 'none', transition: 'background 120ms ease' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = '#f4f3f1'; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
          >
            Notification preferences
          </Link>

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={handleSignOut}
            disabled={busy}
            aria-disabled={busy || undefined}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, border: 0, background: 'transparent', padding: '8px 12px', color: '#b0431a', fontSize: 12, lineHeight: 1.45, textAlign: 'left', cursor: busy ? 'wait' : 'pointer', transition: 'background 120ms ease' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = '#f4f3f1'; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
          {error ? <p role="alert" style={{ margin: 0, padding: '8px 12px', color: '#b0431a', fontSize: 11, lineHeight: 1.45 }}>{error}</p> : null}
        </div>
      )}
    </div>
  );
}
