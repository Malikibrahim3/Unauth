/**
 * Source provenance and freshness (RUN-20).
 *
 * Four different facts were previously collapsed into one "last update" and one
 * health dot, which is how a row could read "Unknown source" beside a green
 * up-to-date indicator, and how an internal note edit could masquerade as a
 * source refresh. They are separate fields here because they answer separate
 * questions:
 *
 *   identity          which system the record came from, if we know
 *   observedAt        when the source system says the event happened
 *   syncedAt          when we last successfully pulled from that source
 *   appActivityAt     when someone in this product last touched the record
 *
 * Freshness is derived from `syncedAt` only. App activity never makes a stale
 * source look fresh.
 */

export type SourceFreshness = 'fresh' | 'ageing' | 'stale' | 'unknown';

export type SourceProvenance = {
  /** Provider identifier, or null when the record's origin is genuinely unknown. */
  identity: string | null;
  observedAt: string | null;
  syncedAt: string | null;
  appActivityAt: string | null;
  freshness: SourceFreshness;
};

export type ProvenanceInput = {
  identity?: string | null;
  observedAt?: string | null;
  syncedAt?: string | null;
  appActivityAt?: string | null;
  /** Hours after which a synced source is ageing, then stale. */
  ageingAfterHours?: number;
  staleAfterHours?: number;
};

export class ImpossibleProvenanceState extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpossibleProvenanceState';
  }
}

const HOUR_MS = 3_600_000;

function parse(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Builds the provenance view and rejects combinations that cannot be true.
 *
 * The boundary is the right place for this: a caller that assembles an
 * impossible state should fail loudly at assembly rather than render a
 * confident, wrong badge.
 */
export function resolveSourceProvenance(input: ProvenanceInput, nowMs: number): SourceProvenance {
  const identity = input.identity?.trim() ? input.identity.trim() : null;
  const observedAt = input.observedAt ?? null;
  const syncedAt = input.syncedAt ?? null;
  const appActivityAt = input.appActivityAt ?? null;

  const observed = parse(observedAt);
  const synced = parse(syncedAt);

  if (!identity && (observed !== null || synced !== null)) {
    throw new ImpossibleProvenanceState(
      'A record cannot carry a source observation or sync time without a source identity.',
    );
  }
  if (observed !== null && synced !== null && observed > synced) {
    throw new ImpossibleProvenanceState(
      'A source observation cannot be newer than the sync that retrieved it.',
    );
  }
  if (synced !== null && synced > nowMs + HOUR_MS) {
    throw new ImpossibleProvenanceState('A source cannot have been synced in the future.');
  }

  return {
    identity,
    observedAt,
    syncedAt,
    appActivityAt,
    freshness: resolveFreshness({ identity, synced, nowMs, input }),
  };
}

function resolveFreshness({
  identity,
  synced,
  nowMs,
  input,
}: {
  identity: string | null;
  synced: number | null;
  nowMs: number;
  input: ProvenanceInput;
}): SourceFreshness {
  // RUN-20: unknown provenance can never be presented as healthy.
  if (!identity) return 'unknown';
  if (synced === null) return 'unknown';
  const ageHours = (nowMs - synced) / HOUR_MS;
  if (ageHours <= (input.ageingAfterHours ?? 24)) return 'fresh';
  if (ageHours <= (input.staleAfterHours ?? 72)) return 'ageing';
  return 'stale';
}

/** True when the provenance may be presented with a healthy indicator. */
export function isHealthyProvenance(provenance: SourceProvenance): boolean {
  return provenance.identity !== null && provenance.freshness === 'fresh';
}
