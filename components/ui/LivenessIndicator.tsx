'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';
import { Recency } from './Recency';
import {
  isLive,
  type ActivityState,
  type FreshnessState,
  type LiveHeartbeat,
  type TransportState,
} from '@/lib/design/liveness';

const FRESHNESS_STYLE: Record<FreshnessState, { color: string; label: string }> = {
  current: { color: 'var(--uo-route-success)', label: 'Current' },
  stale: { color: 'var(--uo-route-warning)', label: 'Stale' },
  unknown: { color: 'var(--uo-route-neutral)', label: 'Unknown' },
};

const TRANSPORT_LABEL: Record<TransportState, string> = {
  connected: 'Connected',
  offline: 'Offline',
};

interface LivenessIndicatorProps {
  /** Connected/offline. Static — a merely connected transport is not itself success. */
  transport: TransportState;
  /** Idle/updating/syncing/failed. Only updating/syncing show a spinner. */
  activity?: ActivityState;
  /** Current/stale/unknown for the underlying data. */
  freshness: FreshnessState;
  /** Verified subscription + heartbeat. Omit or pass `null` when there is none — never invented. */
  live?: LiveHeartbeat | null;
  /** The data's own recency timestamp, or `undefined` to omit the recency segment entirely. */
  lastDataAt?: string | null;
  /** Optional hint forwarded to `Recency` — see there for why it's never load-bearing for hydration safety. */
  nowMs?: number;
  /** Snapshot data (e.g. a report run) reads "As of …" instead of relative recency. */
  snapshot?: boolean;
  className?: string;
}

/**
 * §7.4's transport / activity / freshness / live grammar as one composable
 * primitive. The four axes stay visually and semantically distinct — this
 * does not collapse them into a single traffic-light dot.
 */
export function LivenessIndicator({
  transport,
  activity = 'idle',
  freshness,
  live = null,
  lastDataAt,
  nowMs,
  snapshot,
  className,
}: LivenessIndicatorProps) {
  const freshnessStyle = FRESHNESS_STYLE[freshness];
  const showSpinner = activity === 'updating' || activity === 'syncing';

  // `isLive` compares against `Date.now()`, which can differ between the
  // server that renders the initial HTML and the browser that hydrates it —
  // exactly the kind of check that must not decide the first render's DOM
  // shape. The dot is absent until mount, then appears if genuinely live.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showLiveDot = mounted && isLive(live, Date.now());

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-[length:var(--uo-route-text-metadata-size)]', className)}
      style={{ color: 'var(--uo-route-text-tertiary)' }}
    >
      {showSpinner ? (
        <Spinner size="sm" delayMs={0} label={activity === 'syncing' ? 'Syncing' : 'Updating'} />
      ) : (
        <span aria-hidden="true" className="relative inline-flex shrink-0" style={{ width: 6, height: 6 }}>
          <span
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: freshnessStyle.color }}
          />
          {showLiveDot ? (
            <span
              className="ua-live-dot"
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: freshnessStyle.color }}
            />
          ) : null}
        </span>
      )}
      <span>{TRANSPORT_LABEL[transport]}</span>
      <span aria-hidden="true">·</span>
      <span title={activity === 'failed' ? 'Last attempt failed' : undefined}>{freshnessStyle.label}</span>
      {lastDataAt !== undefined ? (
        <>
          <span aria-hidden="true">·</span>
          <Recency timestampIso={lastDataAt} nowMs={nowMs} snapshot={snapshot} />
        </>
      ) : null}
    </span>
  );
}
