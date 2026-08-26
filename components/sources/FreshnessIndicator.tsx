export type FreshnessState = 'current' | 'stale' | 'unknown';
export function freshnessFromTimestamp(value: string | null | undefined, nowMs: number, staleAfterMs = 86_400_000): FreshnessState { if (!value) return 'unknown'; const timestamp = Date.parse(value); if (Number.isNaN(timestamp)) return 'unknown'; return nowMs - timestamp > staleAfterMs ? 'stale' : 'current'; }
const COPY: Record<FreshnessState, string> = { current: 'Up to date', stale: 'Stale', unknown: 'Unknown' };
export function FreshnessIndicator({ state, label, className }: { state: FreshnessState; label?: string; className?: string }) { return <span className={`ua-freshness ua-freshness--${state} ${className ?? ''}`} title={`Data freshness: ${COPY[state]}`}><span aria-hidden="true" />{label ?? COPY[state]}</span>; }
