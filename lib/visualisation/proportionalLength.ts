/**
 * Maps a non-negative value to a shared zero-based percentage scale.
 * No visual minimum is applied: equal lengths always mean equal values.
 */
export function proportionalLength(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value <= 0 || maximum <= 0) return 0;
  return Math.min(100, (value / maximum) * 100);
}
