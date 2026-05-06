/**
 * Per-row signal matching helpers.
 *
 * These helpers compute `signals_matched` for an individual order row based
 * solely on signals that are:
 *   1. Actually present (non-blank, non-placeholder) on that row.
 *   2. Matched by at least one OTHER row in the same cluster.
 *
 * This is intentionally separate from the cluster-level `signals_matched`
 * (which is the union of all signals across all pairs in the cluster).
 */

import {
  normaliseEmail,
  normalisePhone,
  normalisePostcode,
  normaliseCard,
  type LinkerOrderInput,
  type LinkerSignal,
} from '../linker';

// ---------------------------------------------------------------------------
// hasValue
// ---------------------------------------------------------------------------

/**
 * Returns true iff `value` is a non-empty, non-placeholder string.
 *
 * Rejects: null, undefined, "", "  ", "N/A", "na", "none", "null",
 * "undefined" (case-insensitive after trim).
 */
export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const v = String(value).trim().toLowerCase();
  return (
    v !== '' &&
    v !== 'n/a' &&
    v !== 'na' &&
    v !== 'none' &&
    v !== 'null' &&
    v !== 'undefined'
  );
}

// ---------------------------------------------------------------------------
// getRowMatchedSignals
// ---------------------------------------------------------------------------

/**
 * Compute which signals are matched for `row` within `clusterRows`.
 *
 * A signal is included only when:
 *   - The row has a non-empty, non-placeholder value for that field.
 *   - At least one OTHER row in `clusterRows` has the same normalised value.
 *
 * The returned signal order mirrors the linker weight ordering (strongest
 * first): card → phone → device → account → email → postcode → ip.
 */
export function getRowMatchedSignals(
  row: LinkerOrderInput,
  clusterRows: LinkerOrderInput[],
): LinkerSignal[] {
  const others = clusterRows.filter((r) => r.order_id !== row.order_id);
  const signals: LinkerSignal[] = [];

  // ── card ────────────────────────────────────────────────────────────────
  if (hasValue(row.card_last4)) {
    const normCard = normaliseCard(row.card_last4, row.card_bin);
    if (
      normCard &&
      others.some((o) => normaliseCard(o.card_last4, o.card_bin) === normCard)
    ) {
      signals.push('card');
    }
  }

  // ── phone ────────────────────────────────────────────────────────────────
  if (hasValue(row.phone)) {
    const normPhone = normalisePhone(row.phone);
    if (
      normPhone &&
      others.some((o) => hasValue(o.phone) && normalisePhone(o.phone) === normPhone)
    ) {
      signals.push('phone');
    }
  }

  // ── device ───────────────────────────────────────────────────────────────
  if (hasValue(row.device_fingerprint)) {
    const dev = row.device_fingerprint!.trim();
    if (dev && others.some((o) => hasValue(o.device_fingerprint) && o.device_fingerprint!.trim() === dev)) {
      signals.push('device');
    }
  }

  // ── account ──────────────────────────────────────────────────────────────
  if (hasValue(row.account_id)) {
    const acc = row.account_id!.trim();
    if (acc && others.some((o) => hasValue(o.account_id) && o.account_id!.trim() === acc)) {
      signals.push('account');
    }
  }

  // ── email ────────────────────────────────────────────────────────────────
  if (hasValue(row.email)) {
    const normEmail = normaliseEmail(row.email);
    if (
      normEmail &&
      others.some((o) => hasValue(o.email) && normaliseEmail(o.email) === normEmail)
    ) {
      signals.push('email');
    }
  }

  // ── postcode ─────────────────────────────────────────────────────────────
  if (hasValue(row.postcode)) {
    const normPostcode = normalisePostcode(row.postcode);
    if (
      normPostcode &&
      others.some(
        (o) => hasValue(o.postcode) && normalisePostcode(o.postcode) === normPostcode,
      )
    ) {
      signals.push('postcode');
    }
  }

  // ── ip ───────────────────────────────────────────────────────────────────
  if (hasValue(row.ip)) {
    const normIP = row.ip!.trim();
    if (
      normIP &&
      others.some((o) => hasValue(o.ip) && o.ip!.trim() === normIP)
    ) {
      signals.push('ip');
    }
  }

  return signals;
}
