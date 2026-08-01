/**
 * Data-freshness indicator for source-derived records. Classifies how recently a
 * record was synced from its source system so stale evidence is visible rather
 * than silently trusted.
 */
export type FreshnessState = 'current' | 'stale' | 'unknown';

/**
 * Default only — §7.4 forbids a universal freshness assumption. This is the
 * record-staleness threshold the Losses ledger has chosen for its own rows,
 * not a UI-wide rule; a connector/provider caller should pass its own
 * domain-owned threshold (e.g. from `lib/connections/freshness.ts`) instead
 * of relying on this default.
 */
const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

export function freshnessFromTimestamp(
  lastSyncedAt: string | null | undefined,
  nowMs: number,
  staleAfterMs: number = DEFAULT_STALE_AFTER_MS,
): FreshnessState {
  if (!lastSyncedAt) return 'unknown';
  const synced = Date.parse(lastSyncedAt);
  if (Number.isNaN(synced)) return 'unknown';
  return nowMs - synced > staleAfterMs ? 'stale' : 'current';
}

const STYLES: Record<FreshnessState, { color: string; label: string }> = {
  current: { color: 'var(--ua-success)', label: 'Up to date' },
  stale: { color: 'var(--ua-warning)', label: 'Stale' },
  unknown: { color: 'var(--ua-text-tertiary)', label: 'Unknown' },
};

export function FreshnessIndicator({
  state,
  label,
  className,
}: {
  state: FreshnessState;
  label?: string;
  className?: string;
}) {
  const style = STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[length:var(--ua-text-metadata-size)] ${className ?? ''}`}
      style={{ color: 'var(--ua-text-tertiary)' }}
      title={`Data freshness: ${style.label}`}
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: style.color, display: 'inline-block' }}
      />
      {label ?? style.label}
    </span>
  );
}
