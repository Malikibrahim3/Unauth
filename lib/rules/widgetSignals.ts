/**
 * lib/rules/widgetSignals.ts
 *
 * Maps the Gorgias widget's resolved claim context (ClaimWidgetData) into the
 * merchant-local signal shape the rules engine consumes.
 *
 * Some signals are not available in the widget context (order value, account
 * age). These map to neutral defaults (null / 0 / false) so a condition
 * referencing them simply does not match rather than throwing.
 *
 */

import type { ClaimWidgetData } from '@/lib/gorgias/widgetData';
import type { IdentitySignals } from '@/lib/rules-engine';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / MS_PER_DAY));
}

export function widgetDataToSignals(
  data: ClaimWidgetData,
  nowMs: number = Date.now(),
): IdentitySignals {
  const lastClaimAt = data.thisStore.lastClaimAt;

  return {
    merchant_claim_count: data.thisStore.claimCount,
    days_since_last_claim: daysSince(lastClaimAt, nowMs),
    claim_types: data.claimTypes,
    order_value_usd: null,
    account_age_days: null,
  };
}
