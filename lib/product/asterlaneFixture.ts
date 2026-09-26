import fixture from './asterlaneAugust2026.json';

export type AsterlaneAugust2026Fixture = typeof fixture;

/**
 * The one synthetic enterprise fixture used by the loss desk. These values are
 * an invariant contract for server read models; pages must derive their values
 * from persisted rows rather than importing this module to paint totals.
 */
export const ASTERLANE_AUGUST_2026 = fixture satisfies AsterlaneAugust2026Fixture;

export function assertAsterlaneAugust2026Invariants(value: AsterlaneAugust2026Fixture = ASTERLANE_AUGUST_2026): void {
  if (value.currency !== 'GBP') throw new Error('Asterlane August fixture must be GBP.');
  if (value.recoveredAndMatchedMinor + value.absorbedMinor !== value.grossExposureMinor) {
    throw new Error('Asterlane August fixture exposure does not reconcile.');
  }
  if (value.absorbedMinor - value.writtenOffMinor !== value.netUnrecoveredMinor) {
    throw new Error('Asterlane August fixture unrecovered amount does not reconcile.');
  }
  if (value.held.rowCount <= 0 || value.held.amountMinor <= 0) {
    throw new Error('Held rows must remain explicit and non-zero.');
  }
  if (value.nonGbpRowCount <= 0) throw new Error('Non-GBP rows must remain visible as held.');
  if (value.workQueue.itemCount <= 0 || value.workQueue.amountMinor <= 0) {
    throw new Error('Work queue fixture must contain actionable items.');
  }
}

assertAsterlaneAugust2026Invariants();
