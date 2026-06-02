import { env } from '@/lib/utils/env';
import { parseProductGateEnv } from '@/lib/product/envFlags';

export { parseProductGateEnv } from '@/lib/product/envFlags';

/** Server-side product gate enforcement flag (reads `env.ENFORCE_PRODUCT_GATES`). */
export function shouldEnforceProductGates(): boolean {
  return parseProductGateEnv(env.ENFORCE_PRODUCT_GATES);
}
