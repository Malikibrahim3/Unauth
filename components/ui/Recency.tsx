'use client';

import { useEffect, useId, useState } from 'react';
import { formatAbsolute, formatAsOf, formatRecency } from '@/lib/design/liveness';

interface RecencyProps {
  timestampIso: string | null | undefined;
  /**
   * Optional hint from a Server Component's own `Date.now()`. Only read
   * post-mount (see below) — never used to decide what the very first render
   * shows, so a careless client-component caller passing its own mismatched
   * `Date.now()` here cannot reintroduce a hydration mismatch.
   */
  nowMs?: number;
  /** Renders "As of …" instead of relative "Updated … ago" — for snapshot (non-live) data. */
  snapshot?: boolean;
  className?: string;
}

/**
 * §7.4's recency copy: a visible `<time dateTime>` plus an absolute
 * timestamp associated through `aria-describedby`. Refreshes at most once a
 * minute — the label never counts up continuously.
 *
 * `toLocaleString` resolves the *runtime's* default locale and time zone,
 * which can genuinely differ between the server that renders the initial
 * HTML and the browser that hydrates it. Rendering that before mount is a
 * hydration mismatch waiting to happen, so this component's pre-mount
 * output is always the raw ISO string — locale/timezone-independent by
 * construction — and only upgrades to human-readable copy once mounted.
 */
export function Recency({ timestampIso, nowMs, snapshot = false, className }: RecencyProps) {
  const [mounted, setMounted] = useState(false);
  const [clientNowMs, setClientNowMs] = useState<number | null>(null);
  const describedById = useId();

  useEffect(() => {
    setMounted(true);
    if (snapshot) return; // "As of" copy does not tick.
    setClientNowMs(nowMs ?? Date.now());
    const interval = setInterval(() => setClientNowMs(Date.now()), 60_000);
    return () => clearInterval(interval);
    // Only the tick cadence depends on `snapshot`; a later `nowMs` prop change
    // must not restart this timer or fight the live tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  if (!timestampIso) {
    return <span className={className}>Unknown</span>;
  }

  if (!mounted) {
    return (
      <time dateTime={timestampIso} className={className}>
        {timestampIso}
      </time>
    );
  }

  const label = snapshot || clientNowMs === null ? formatAsOf(timestampIso) : formatRecency(timestampIso, clientNowMs);

  return (
    <>
      <time dateTime={timestampIso} aria-describedby={describedById} className={className}>
        {label}
      </time>
      <span id={describedById} className="sr-only">
        {formatAbsolute(timestampIso)}
      </span>
    </>
  );
}
