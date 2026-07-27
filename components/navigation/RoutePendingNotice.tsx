'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DELAY } from '@/lib/design/motion';

/**
 * Living Precision §7.3. After 8s of a genuinely pending navigation the product
 * explains itself rather than leaving an indefinite loader.
 *
 * It deliberately claims nothing it cannot know: not cancellation, not failure,
 * not completion. "Open directly" appears only for a safe same-origin path, and
 * is a plain navigation to the pending URL — never a mutation.
 */
export default function RoutePendingNotice({ pendingHref }: { pendingHref: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pendingHref) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(true), DELAY.slowLoadNotice);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  if (!show || !pendingHref) return null;

  // Same-origin GET destinations only: a protocol-relative or absolute URL could
  // send the user off-product, so it never earns the direct-open affordance.
  const sameOriginPath = pendingHref.startsWith('/') && !pendingHref.startsWith('//');

  return (
    <div
      role="status"
      aria-live="polite"
      className="ua-auth-surface fixed inset-x-0 bottom-4 z-[var(--ua-z-toast)] mx-auto flex w-fit max-w-[min(560px,calc(100%-var(--ua-space-8)))] items-center gap-[var(--ua-space-3)] rounded-[var(--ua-radius-overlay)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-[var(--ua-space-4)] py-[var(--ua-space-2-5)] shadow-[var(--ua-shadow-menu)]"
    >
      <p className="m-0 text-[length:var(--ua-text-dense-size)] leading-[var(--ua-text-dense-leading)] text-[var(--ua-text-secondary)]">
        This page is taking longer than expected.
      </p>
      {sameOriginPath ? (
        <Button variant="secondary" size="sm" onClick={() => { window.location.href = pendingHref; }}>
          Open directly
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Reload current page
        </Button>
      )}
    </div>
  );
}
