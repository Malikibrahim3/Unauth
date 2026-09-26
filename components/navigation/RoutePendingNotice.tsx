'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DELAY } from '@/lib/design/motion';

/**
 * Evidence Operations. After 8s of a genuinely pending navigation the product
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
      className="fixed inset-x-0 bottom-4 z-[80] mx-auto flex w-fit max-w-[min(560px,calc(100%-2rem))] items-center gap-3 rounded-[14px] border border-[#e4e3e0] bg-white px-4 py-3 text-[#1c1f23] shadow-[0_12px_30px_rgba(28,27,25,.12)]"
    >
      <p className="m-0 text-[12px] leading-5 text-[#64686d]">
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
