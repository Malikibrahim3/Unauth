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
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  INTERNAL_HMAC_SECRET: z.string().min(32).optional(),
  PUBLIC_INTAKE_MERCHANT_ID: z.string().uuid().optional(),
  VERCEL_ENV: z.string().optional(),
  FLAG_THRESHOLD: z.coerce.number().default(44),
  INLINE_RESTITCH_MAX_ROWS: z.coerce.number().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  SYNC_BACKGROUND_WRITES: z.string().optional(),
  SKIP_OPTIONAL_BACKGROUND_WRITES: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  SKIP_CROSS_MERCHANT_CONTEXT: z.string().optional(),
  SUPABASE_DB_USAGE_LIMIT_MB: z.coerce.number().optional(),
  SUPABASE_DB_USAGE_HEADROOM_MB: z.coerce.number().optional(),
  AUDIT_EMAIL_FROM: z.string().optional(),
  SHOPIFY_API_KEY: z.string().min(1).optional(),
  SHOPIFY_API_SECRET: z.string().min(1).optional(),
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
