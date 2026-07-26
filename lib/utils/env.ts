import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  IDENTITY_SALT: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  // Optional locally, required in production/preview
  RESEND_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  INVESTIGATION_MALWARE_SCAN_URL: z.string().url().optional(),
  INVESTIGATION_MALWARE_SCAN_TOKEN: z.string().min(16).optional(),
  /** Keep false/unset until the Release 1 investigation workflow is enabled for a controlled cohort. */
  INVESTIGATIONS_ENABLED: z.string().optional(),
  /** Independent external-action kill switch; merchant email settings cannot override it. */
  INVESTIGATION_EMAIL_DISPATCH_ENABLED: z.string().optional(),
  /** Keep false/unset until a generic ingestion processor is deployed and proven. */
  GENERIC_EVENT_INGESTION_ENABLED: z.string().optional(),
  /** Keep false/unset until published flows have replay and idempotency proof. */
  WORKFLOW_PUBLICATION_ENABLED: z.string().optional(),
  /** Keep false/unset while the legacy/public gate bypasses canonical transitions. */
  PUBLIC_CLAIM_GATE_ENABLED: z.string().optional(),
  /** Keep false/unset until cross-merchant context has product, privacy, and runtime approval. */
  NETWORK_CONTEXT_ENABLED: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  INTERNAL_HMAC_SECRET: z.string().min(32).optional(),
  INTERNAL_SUPPORT_INGEST_SECRET: z.string().min(32).optional(),
  PDF_SIGNING_SECRET: z.string().min(32).optional(),
  VERCEL_ENV: z.string().optional(),
  FLAG_THRESHOLD: z.coerce.number().default(44),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  VERCEL_URL: z.string().optional(),
  SKIP_CROSS_MERCHANT_CONTEXT: z.string().optional(),
  AUDIT_EMAIL_FROM: z.string().optional(),
  SHOPIFY_API_KEY: z.string().min(1).optional(),
  SHOPIFY_API_SECRET: z.string().min(1).optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
  GORGIAS_SUPPORT_WEBHOOK_SECRET: z.string().min(32).optional(),
  FRESHDESK_SUPPORT_WEBHOOK_SECRET: z.string().min(32).optional(),
  ZENDESK_SUPPORT_WEBHOOK_SECRET: z.string().min(32).optional(),
  BIGCOMMERCE_CLIENT_ID: z.string().min(1).optional(),
  BIGCOMMERCE_CLIENT_SECRET: z.string().min(1).optional(),
  ENFORCE_PRODUCT_GATES: z.string().optional(),
  NEXT_PUBLIC_ENFORCE_PRODUCT_GATES: z.string().optional(),
  /** Set to `true` in Vercel/host env to enforce paid tiers from `subscriptions`. */
  BILLING_ACTIVE: z.string().optional(),
  /** Stripe — optional until billing is wired; required for checkout/webhooks in production. */
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_PRO: z.string().min(1).optional(),
  STRIPE_PRICE_GROWTH: z.string().min(1).optional(),
  STRIPE_PRICE_TOPUP: z.string().min(1).optional(),
  /** Internal notification for Scale "Contact us" requests. */
  BILLING_CONTACT_EMAIL: z.string().email().optional(),
  /** Local/test-only secret for /api/test/e2e-auth — never set in production. */
  E2E_AUTH_SECRET: z.string().min(16).optional(),
  /** Legacy single-environment ShipBob OAuth pair. Prefer explicit pairs below. */
  SHIPBOB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  SHIPBOB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  /** ShipBob OAuth app credentials are environment-specific. */
  SHIPBOB_SANDBOX_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  SHIPBOB_SANDBOX_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  SHIPBOB_PRODUCTION_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  SHIPBOB_PRODUCTION_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  /** Legacy local flag used only to identify the legacy pair as sandbox. */
  SHIPBOB_SANDBOX: z.string().optional(),
  /** Webhook URL notified when a warehouse pack-confirmation photo is uploaded. */
  PACK_CONFIRMATION_NOTIFY_URL: z.string().url().optional(),
  /** Absolute app URL shadow alias read by claim-gate/collector code paths. */
  APP_URL: z.string().url().optional(),
  /** Merchant id scoped to the public /demo page. */
  NEXT_PUBLIC_DEMO_MERCHANT_ID: z.string().uuid().optional(),
}).superRefine((env, ctx) => {
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required',
      path: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    });
  }

  const isDeployed = env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview';
  if (isDeployed) {
    const required: Array<keyof typeof env> = [
      'RESEND_API_KEY',
      'CRON_SECRET',
      'INVESTIGATION_MALWARE_SCAN_URL',
      'INVESTIGATION_MALWARE_SCAN_TOKEN',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'INTERNAL_HMAC_SECRET',
      'SHOPIFY_API_KEY',
      'SHOPIFY_API_SECRET',
      'SHOPIFY_WEBHOOK_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ];
    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required in ${env.VERCEL_ENV}`,
          path: [key],
        });
      }
    }
  }
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  return result.data;
}

export const env = validateEnv();
