import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG = '--merchant-id';

export function parseSmokeSupportIntakeArgs(argv: string[]): { merchantId: string } {
  const flagIndex = argv.indexOf(SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG);
  if (flagIndex === -1 || !argv[flagIndex + 1]) {
    throw new Error(
      `Missing ${SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG} <uuid>. ` +
        'Example: npm run smoke:support-intake -- --merchant-id <merchant_id>'
    );
  }

  const merchantId = argv[flagIndex + 1].trim();
  const parsed = uuidSchema.safeParse(merchantId);
  if (!parsed.success) {
    throw new Error(`Invalid ${SMOKE_SUPPORT_INTAKE_MERCHANT_ID_FLAG}: must be a UUID`);
  }

  return { merchantId: parsed.data };
}

export function requireSmokeSupabaseEnv(env: NodeJS.ProcessEnv = process.env): {
  supabaseUrl: string;
  serviceRoleKey: string;
} {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only). ' +
        'Load .env.local or export them before running the smoke script.'
    );
  }

  return { supabaseUrl, serviceRoleKey };
}
