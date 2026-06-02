/** Parses ENFORCE_PRODUCT_GATES / NEXT_PUBLIC_ENFORCE_PRODUCT_GATES (`true` or `1` only). */
export function parseProductGateEnv(value: string | undefined): boolean {
  if (value === undefined || value === '') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}
