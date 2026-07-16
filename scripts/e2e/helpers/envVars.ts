/**
 * Central accessor for the E2E-suite environment variables. These are test-only
 * vars and are intentionally read straight from process.env (CLAUDE.md allows
 * scripts to bypass the Zod `env` object). loadEnv.ts must run first.
 */

export type E2EVarSpec = {
  name: string;
  /** When true, the suite can run without it (auto-created or optional). */
  optional?: boolean;
  /** Human note shown when missing. */
  note?: string;
};

/**
 * Required E2E variables, in the display order used by preflight 1a.
 * E2E_MERCHANT_ID_B is the only "missing is OK" var — preflight auto-creates it.
 */
export const E2E_REQUIRED_VARS: E2EVarSpec[] = [
  { name: 'SHOPIFY_ADMIN_API_TOKEN' },
  { name: 'SHOPIFY_STORE_DOMAIN' },
  { name: 'GORGIAS_API_TOKEN' },
  { name: 'GORGIAS_API_EMAIL' },
  { name: 'GORGIAS_BASE_URL' },
  { name: 'GORGIAS_SUPPORT_WEBHOOK_SECRET' },
  { name: 'E2E_WEBHOOK_URL' },
  { name: 'E2E_MERCHANT_ID' },
  { name: 'E2E_MERCHANT_ID_B', optional: true, note: 'will auto-create' },
  // SUPABASE_URL is bridged from NEXT_PUBLIC_SUPABASE_URL in loadEnv.
  { name: 'SUPABASE_URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY' },
  { name: 'INTERNAL_HMAC_SECRET' },
  { name: 'IDENTITY_SALT' },
];

export function getVar(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function requireVar(name: string): string {
  const v = getVar(name);
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

/** Gorgias REST base URL, normalised to no trailing slash (e.g. https://acme.gorgias.com). */
export function gorgiasBaseUrl(): string {
  return requireVar('GORGIAS_BASE_URL').replace(/\/$/, '');
}

/** Gorgias account domain host (e.g. acme.gorgias.com) derived from the base URL. */
export function gorgiasDomain(): string {
  const base = gorgiasBaseUrl();
  return base.replace(/^https?:\/\//i, '').split('/')[0]?.toLowerCase() ?? base;
}

/** Shopify store domain, normalised to host only (no scheme). */
export function shopifyStoreDomain(): string {
  return requireVar('SHOPIFY_STORE_DOMAIN')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function webhookBaseUrl(): string {
  return requireVar('E2E_WEBHOOK_URL').replace(/\/$/, '');
}

/** Where the Gorgias integration is registered (must be public https) and asserted. */
export function supportWebhookUrl(): string {
  return `${webhookBaseUrl()}/api/gorgias/support-webhook`;
}

/**
 * Where the suite actually POSTs signed webhooks. Defaults to E2E_WEBHOOK_URL,
 * but can point at a local `next dev` (E2E_INGEST_URL) so ingestion runs the
 * latest code with the same IDENTITY_SALT/INTERNAL_HMAC_SECRET as the test — the
 * deployed build may lag (different salt, no webhook_logs). Still hits the real
 * shared Supabase + real Gorgias connection.
 */
export function ingestBaseUrl(): string {
  return (getVar('E2E_INGEST_URL') ?? webhookBaseUrl()).replace(/\/$/, '');
}

export function ingestWebhookUrl(): string {
  return `${ingestBaseUrl()}/api/gorgias/support-webhook`;
}

/** True when ingestion is being delivered to a different host than registration. */
export function ingestIsSplit(): boolean {
  return !!getVar('E2E_INGEST_URL') && ingestBaseUrl() !== webhookBaseUrl();
}

/** Mask an email to `cu***@domain.com` so console output never leaks full PII. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

/** Truncate any hash/secret for safe logging. */
export function maskHash(value: string | null | undefined): string {
  if (!value) return '∅';
  return `${value.slice(0, 6)}…`;
}
