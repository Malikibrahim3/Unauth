/**
 * Monitored data-quality contract failures.
 *
 * RUN-09 and RUN-12 both need the same thing: when a value violates a contract
 * the product depends on — money without a currency, a persisted enum with no
 * merchant-facing label — the UI must degrade to an explicit, truthful state
 * *and* the violation must be observable. A `console.warn` behind
 * `NODE_ENV !== 'production'` satisfies neither: it is invisible in production,
 * which is exactly where the bad data lives.
 *
 * Reports are de-duplicated by signature so a bad value rendered in a thousand
 * table rows produces one report, not a thousand.
 */

export type DataQualityKind =
  | 'money.currency_missing'
  | 'money.currency_unrecognised'
  | 'label.enum_unmapped';

export type DataQualityEvent = {
  kind: DataQualityKind;
  /** Stable identifier for the offending value, safe to log (never a money amount or PII). */
  subject: string;
  detail: string;
  count: number;
};

const seen = new Map<string, DataQualityEvent>();

/**
 * Records a contract failure. Returns the event so callers can assert on it
 * without reaching into module state.
 */
export function reportDataQuality(input: {
  kind: DataQualityKind;
  subject: string;
  detail: string;
}): DataQualityEvent {
  const signature = `${input.kind}:${input.subject}`;
  const existing = seen.get(signature);
  if (existing) {
    existing.count += 1;
    return existing;
  }
  const event: DataQualityEvent = { ...input, count: 1 };
  seen.set(signature, event);
  // A single stable prefix so this is greppable in logs and alertable in
  // whatever aggregator consumes them.
  console.error(`[data-quality] ${input.kind} subject=${input.subject} — ${input.detail}`);
  return event;
}

/** All distinct contract failures recorded so far. */
export function dataQualityEvents(): DataQualityEvent[] {
  return [...seen.values()];
}

/** Clears recorded events. Intended for tests and long-lived worker processes. */
export function resetDataQuality(): void {
  seen.clear();
}
