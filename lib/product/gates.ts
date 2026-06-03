import { parseProductGateEnv } from '@/lib/product/envFlags';

export { parseProductGateEnv } from '@/lib/product/envFlags';

/** Server-side product gate enforcement flag (reads `ENFORCE_PRODUCT_GATES`). */
export function shouldEnforceProductGates(): boolean {
  return parseProductGateEnv(process.env.ENFORCE_PRODUCT_GATES);
}
