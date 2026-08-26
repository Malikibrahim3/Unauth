import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  IDENTITY_SALT: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_AMPLITUDE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_INTEGRATION_HEALTH_FAST_POLL_MS: z.coerce.number().int().positive().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NODE_ENV: z.string().optional(),
  CI: z.string().optional(),
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
  NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
  SKIP_CROSS_MERCHANT_CONTEXT: z.string().optional(),
  AUDIT_EMAIL_FROM: z.string().optional(),
  SHOPIFY_API_KEY: z.string().min(1).optional(),
  SHOPIFY_API_SECRET: z.string().min(1).optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
  GORGIAS_SUPPORT_WEBHOOK_SECRET: z.string().min(32).optional(),
  GORGIAS_WEBHOOK_LOCAL_URL: z.string().url().optional(),
  GORGIAS_WEBHOOK_BASE_URL: z.string().url().optional(),
  GORGIAS_WEBHOOK_FORCE_REMOTE: z.string().optional(),
  GORGIAS_SUPPORT_TEST_MERCHANT_ID: z.string().uuid().optional(),
  /** Independent kill switch for the bounded Gorgias internal-note and tag writeback. */
  GORGIAS_BOUNDED_WRITEBACK_ENABLED: z.string().optional(),
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
  SHIPBOB_AUTHORIZED_TEST_MODE: z.string().optional(),
  /** Webhook URL notified when a warehouse pack-confirmation photo is uploaded. */
  PACK_CONFIRMATION_NOTIFY_URL: z.string().url().optional(),
  /** Absolute app URL shadow alias read by claim-gate/collector code paths. */
  APP_URL: z.string().url().optional(),
  /** Merchant id scoped to the public /demo page. */
  NEXT_PUBLIC_DEMO_MERCHANT_ID: z.string().uuid().optional(),
  SHOPIFY_ADMIN_API_TOKEN: z.string().min(1).optional(),
  SHOPIFY_ADMIN_API_VERSION: z.string().min(1).optional(),
  SHOPIFY_STORE_DOMAIN: z.string().min(1).optional(),
  GORGIAS_API_TOKEN: z.string().min(1).optional(),
  GORGIAS_API_EMAIL: z.string().email().optional(),
  GORGIAS_BASE_URL: z.string().url().optional(),
  E2E_WEBHOOK_URL: z.string().url().optional(),
  E2E_INGEST_URL: z.string().url().optional(),
  E2E_MERCHANT_ID: z.string().uuid().optional(),
  E2E_MERCHANT_ID_B: z.string().uuid().optional(),
  E2E_CASE_ID: z.string().uuid().optional(),
  E2E_TICKET_ID: z.string().min(1).optional(),
  E2E_ORDER_NUMBER: z.string().min(1).optional(),
  E2E_CUSTOMER_EMAIL: z.string().email().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_DB_URL: z.string().url().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  CAPTURE_LANDING_EVIDENCE: z.string().optional(),
  E2E_ALLOWED_MERCHANT_IDS: z.string().optional(),
  MERCHANT_ID: z.string().optional(),
  PLAYWRIGHT_BASE_URL: z.string().url().optional(),
  RECONCILIATION_SMOKE_MERCHANT_ID: z.string().optional(),
  RELEASE_E2E_LOCAL: z.string().optional(),
  RELEASE_E2E_PORT: z.coerce.number().int().positive().optional(),
  ROTATION_TS: z.string().optional(),
  RUN_DB_INTEGRATION: z.string().optional(),
  RUN_LIVE_DB: z.string().optional(),
  SEED_BACKGROUND_ORDER_COUNT: z.coerce.number().int().nonnegative().optional(),
  SEED_CASE_AMOUNT_SCALE: z.coerce.number().positive().optional(),
  SEED_CUSTOMER_COUNT: z.coerce.number().int().nonnegative().optional(),
  SEED_CUSTOMER_EMAIL_DOMAIN: z.string().optional(),
  SEED_MERCHANT_ID: z.string().optional(),
  SEED_ORDER_NUMBER_PREFIX: z.string().optional(),
  SEED_OWNER_PASSWORD: z.string().optional(),
  SEED_PREFIX: z.string().optional(),
  SEED_RECIPIENT_USER_ID: z.string().optional(),
  SEED_SOURCE_LABEL: z.string().optional(),
  SEED_SOURCE_NAME: z.string().optional(),
  SEED_SOURCE_SYSTEM: z.string().optional(),
  SEED_TAG: z.string().optional(),
  SEED_USE_GENERATED_RULE_IDS: z.string().optional(),
  TEST_PROVIDER_KEY: z.string().optional(),
  TS_NODE_COMPILER_OPTIONS: z.string().optional(),
  UNAUTH_NEXT_DIST_DIR: z.string().optional(),
  VITE_UNAUTH_API_BASE: z.string().url().optional(),
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

  if (env.INVESTIGATIONS_ENABLED === 'true') {
    for (const key of [
      'INVESTIGATION_MALWARE_SCAN_URL',
      'INVESTIGATION_MALWARE_SCAN_TOKEN',
    ] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when investigations are enabled`,
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
