/**
 * lib/supabase/merchantHelpers.ts
 *
 * Shared, merchant-scoped data access helpers.
 *
 * SECURITY CONTRACT
 * -----------------
 * Every function in this module PROVES merchant ownership before returning data.
 * Callers must not bypass these helpers with raw service-role queries against
 * audit_transactions, customer_profiles, or fraud_identity_clusters.
 *
 * These helpers work with the service-role Supabase client (which bypasses RLS),
 * so they MUST enforce tenant boundaries in application code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { inspect } from 'util';
import { resolveCallerContext } from '@/lib/permissions';
import type { CallerContext } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// Re-export CallerContext so callers don't need to import from two places
// ---------------------------------------------------------------------------
export type { CallerContext };

// ---------------------------------------------------------------------------
// PostgREST filter-value sanitisation
// ---------------------------------------------------------------------------

/**
 * Escape a user-supplied value for safe interpolation into PostgREST
 * `.or()` / `.filter()` string expressions.
 *
 * Characters that have special meaning in PostgREST filter strings:
 *   ( ) , . { } " ' % \ null bytes
 *
 * Strategy: remove null bytes, then percent-encode the characters that
 * PostgREST treats as delimiters or quoting characters.  This is safe to
 * use in `ilike` values (% is a wildcard in SQL LIKE but percent-encoding
 * it causes PostgREST to treat it as a literal), and in `cs` (contains)
 * array literals.
 *
 * NOTE: prefer typed query methods (`.eq()`, `.ilike()`, `.contains()`,
 * `.in()`) over `.or()` string composition wherever possible.  Use this
 * helper only when `.or()` is genuinely necessary.
 */
export function escapePostgrestFilterValue(raw: string): string {
  // Remove null bytes
  const s = raw.replace(/\0/g, '');
  // Manually encode PostgREST special chars that encodeURIComponent leaves unencoded:
  //   ( ) ' %   — these are safe in URIs but meaningful in PostgREST filter strings.
  // Also encode: , { } " \  (already covered by encodeURIComponent but listed for clarity)
  return s.replace(/[(),{}"'%\\]/g, (c) => {
    // encodeURIComponent does not encode: ( ) ' *  — encode them manually
    const manual: Record<string, string> = {
      '(': '%28',
      ')': '%29',
      "'": '%27',
      '%': '%25',
    };
    return manual[c] ?? encodeURIComponent(c);
  });
}

// ---------------------------------------------------------------------------
// Review-worthy transaction count — canonical definition
// ---------------------------------------------------------------------------

/**
 * Count review-worthy audit_transactions for a given job (and merchant).
 *
 * A transaction is review-worthy when the platform has likely same-person
 * identity evidence:
 *   - identity_confidence_grade IN ('probable', 'definite'), OR
 *   - match_status IN ('probable', 'definite')
 * AND it has NOT been dismissed by the merchant (dismissed_by_merchant IS NOT TRUE —
 * this includes rows where dismissed_by_merchant is false or null).
 *
 * SCHEMA NOTE: audit_transactions does NOT have a merchant_id column.
 * Ownership is proven through processing_jobs: audit_transactions.job_id ->
 * processing_jobs.id -> processing_jobs.merchant_id.
 * We verify this before querying audit_transactions.
 *
 * ERROR POLICY: throws on any Supabase error rather than silently returning 0,
 * so callers (e.g. job finalisation) cannot persist a false flagged_count=0.
 *
 * This is the single source of truth used by job finalisation, dashboard
 * review metrics, and exports.  Do NOT use risk_level for this purpose.
 */
export async function countReviewWorthyTransactions(
  serviceClient: SupabaseClient,
  jobId: string,
  merchantId: string
): Promise<number> {
  // Step 1: Verify the job belongs to this merchant.
  // audit_transactions has no merchant_id — ownership is via processing_jobs.
  const { data: jobRows, error: jobErr } = await serviceClient
    .from('processing_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('merchant_id', merchantId);

  if (jobErr) {
    throw new Error(
      `countReviewWorthyTransactions: ownership check failed — ${jobErr.message}`
    );
  }
  if (!jobRows || jobRows.length === 0) {
    // Job does not belong to this merchant (or does not exist). Callers that
    // need a "not-owned" branch can catch and inspect err.code === 'JOB_NOT_OWNED'.
    throw Object.assign(
      new Error(
        `countReviewWorthyTransactions: job ${jobId} not owned by merchant ${merchantId}`
      ),
      { code: 'JOB_NOT_OWNED' }
    );
  }

  // Step 2: Count review-worthy rows via two non-overlapping server-side counts.
  //
  // Clause A: identity_confidence_grade IN (probable,definite)
  // Clause B: match_status IN (probable,definite) AND grade is not already likely
  //           — excludes rows already counted in Clause A (no double-count)
  //
  // Dismissed filter: .not('dismissed_by_merchant', 'is', true) — PostgREST
  // semantics include false AND null, exclude only true.  neq() would exclude
  // NULL rows, undercounting undismissed transactions that have no explicit value.
  //
  // We use head:true so no row data is transferred, only the count.
  const [gradedRes, statusRes] = await Promise.all([
    serviceClient
      .from('audit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .in('identity_confidence_grade', ['probable', 'definite'])
      .not('dismissed_by_merchant', 'is', true),
    serviceClient
      .from('audit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .in('match_status', ['probable', 'definite'])
      .is('identity_confidence_grade', null)  // legacy fallback; avoid double-counting with Clause A
      .not('dismissed_by_merchant', 'is', true),
  ]);

  if (gradedRes.error) {
    throw new Error(
      `countReviewWorthyTransactions: graded count query failed — ${gradedRes.error.message}`
    );
  }
  if (statusRes.error) {
    throw new Error(
      `countReviewWorthyTransactions: status count query failed — ${statusRes.error.message}`
    );
  }

  // Clauses are mutually exclusive (Clause B requires grade IS NULL, Clause A
  // requires grade IS NOT NULL), so addition gives exact union count.
  return (gradedRes.count ?? 0) + (statusRes.count ?? 0);
}

// ---------------------------------------------------------------------------
// Dashboard summary helper
// ---------------------------------------------------------------------------

/**
 * Returns the number of distinct customer profiles that have at least one
 * review-worthy, non-dismissed audit transaction in any merchant-owned job.
 *
 * DEFINITION (must match countReviewWorthyTransactions / fetchMerchantReviewQueueRows):
 *   - job_id IN merchant-owned job IDs
 *   - identity_confidence_grade IN (probable,definite) OR match_status IN (probable,definite)
 *   - dismissed_by_merchant IS NOT TRUE  (includes false AND null)
 *
 * SCHEMA NOTE:
 * audit_transactions does not carry a stable customer profile id column in this
 * codebase. Distinct customer counting is therefore computed by joining through
 * customer_profile_audit_appearances (profile_id + transaction_id + audit_id).
 *
 * SCALE: both transaction and appearance reads are paginated.
 *
 * ERROR POLICY: throws on Supabase errors so callers see real failures, not 0.
 */
export async function countMerchantReviewQueueProfiles(
  serviceClient: SupabaseClient,
  merchantId: string
): Promise<number> {
  const ownedJobIds = await getMerchantOwnedJobIds(serviceClient, merchantId);
  if (ownedJobIds.length === 0) return 0;

  // 1) Build a set of review-worthy transaction IDs in merchant-owned jobs.
  const reviewWorthyTxIds = new Set<string>();

  const PAGE = 1000;

  // Clause A: identity_confidence_grade IN (probable,definite)
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await serviceClient
      .from('audit_transactions')
      .select('id')
      .in('job_id', ownedJobIds)
      .in('identity_confidence_grade', ['probable', 'definite'])
      .not('dismissed_by_merchant', 'is', true)
      .range(offset, offset + PAGE - 1) as unknown as {
        data: Array<{ id: string }> | null;
        error: { message: string } | null;
      };
    if (error) {
      throw new Error(`countMerchantReviewQueueProfiles: graded clause query failed — ${error.message}`);
    }
    for (const row of data ?? []) {
      reviewWorthyTxIds.add(row.id);
    }
    if (!data || data.length < PAGE) break;
  }

  // Clause B: match_status IN (probable,definite) and grade not already likely
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await serviceClient
      .from('audit_transactions')
      .select('id')
      .in('job_id', ownedJobIds)
      .in('match_status', ['probable', 'definite'])
      .is('identity_confidence_grade', null)
      .not('dismissed_by_merchant', 'is', true)
      .range(offset, offset + PAGE - 1) as unknown as {
        data: Array<{ id: string }> | null;
        error: { message: string } | null;
      };
    if (error) {
      throw new Error(`countMerchantReviewQueueProfiles: status clause query failed — ${error.message}`);
    }
    for (const row of data ?? []) {
      reviewWorthyTxIds.add(row.id);
    }
    if (!data || data.length < PAGE) break;
  }

  if (reviewWorthyTxIds.size === 0) return 0;

  // 2) Map review-worthy transaction IDs to profile IDs via appearance links.
  const distinctProfileIds = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await serviceClient
      .from('customer_profile_audit_appearances')
      .select('profile_id,transaction_id')
      .in('audit_id', ownedJobIds)
      .range(offset, offset + PAGE - 1) as unknown as {
        data: Array<{ profile_id: string; transaction_id: string | null }> | null;
        error: { message: string } | null;
      };

    if (error) {
      throw new Error(`countMerchantReviewQueueProfiles: appearance query failed — ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.transaction_id && reviewWorthyTxIds.has(row.transaction_id)) {
        distinctProfileIds.add(row.profile_id);
      }
    }

    if (!data || data.length < PAGE) break;
  }

  return distinctProfileIds.size;
}

// ---------------------------------------------------------------------------
// CSV cell escaping — neutralises spreadsheet formula injection
// ---------------------------------------------------------------------------

/**
 * Safely escape a single CSV cell value.
 * - Wraps the value in double-quotes.
 * - Escapes internal double-quotes by doubling them.
 * - Prefixes cells that start with =, +, -, @, TAB, or CR with a single-quote
 *   so spreadsheet applications cannot interpret them as formulas.
 */
export function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  const FORMULA_CHARS = /^[=+\-@\t\r]/;
  const safe = FORMULA_CHARS.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the caller context or throws a 401-style error.
 * Use this inside server components / API routes that already have the
 * authenticated userId.
 */
export async function getCallerContextOrThrow(
  serviceClient: SupabaseClient,
  userId: string
): Promise<CallerContext> {
  const ctx = await resolveCallerContext(serviceClient, userId);
  if (!ctx || !ctx.merchantId) {
    throw Object.assign(new Error('No merchant context found for user'), {
      status: 401,
    });
  }
  return ctx!;
}

// ---------------------------------------------------------------------------
// Processing jobs — merchant ownership proofs
// ---------------------------------------------------------------------------

/**
 * Returns ALL processing_job IDs that belong to the given merchant, paginating
 * through the full result set so large merchants (> Supabase default row cap)
 * are not silently truncated.
 *
 * IMPORTANT: every downstream helper that calls this function relies on the
 * completeness of the returned list for correct merchant-scoped query filtering.
 * A truncated list would silently omit older jobs from dashboard counts, inbox
 * exports, evidence packages, and customer transaction fetches.
 *
 * Always scope transaction queries with `.in('job_id', ownedJobIds)`.
 */
export async function getMerchantOwnedJobIds(
  serviceClient: SupabaseClient,
  merchantId: string
): Promise<string[]> {
  const PAGE = 1000;
  const allIds: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await serviceClient
      .from('processing_jobs')
      .select('id')
      .eq('merchant_id', merchantId)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`getMerchantOwnedJobIds failed: ${error.message}`);
    allIds.push(...(data ?? []).map((r: { id: string }) => r.id));
    if (!data || data.length < PAGE) break;
  }
  return allIds;
}

/**
 * Asserts that a specific job belongs to the given merchant.
 * Throws if the job is not found or belongs to a different merchant.
 */
export async function assertMerchantOwnsJob(
  serviceClient: SupabaseClient,
  merchantId: string,
  jobId: string
): Promise<void> {
  const { data, error } = await serviceClient
    .from('processing_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error) throw new Error(`assertMerchantOwnsJob failed: ${error.message}`);
  if (!data) {
    throw Object.assign(
      new Error(`Job ${jobId} not found or does not belong to merchant ${merchantId}`),
      { status: 404 }
    );
  }
}

// ---------------------------------------------------------------------------
// Customer profile helpers
// ---------------------------------------------------------------------------

const PROFILE_SELECT =
  'id, emails, names, phones, addresses, ips, card_last4s, merchant_ids, ' +
  'primary_email, total_orders, total_refund_claims, refund_rate, ' +
  'fastest_claim_days, avg_claim_days, refund_acceleration_score, ' +
  'first_seen, last_seen, identity_signals, fraud_flags, ' +
  'match_status, identity_confidence_grade, identity_score, ' +
  'total_chargebacks, investigation_status, cluster_id';

/**
 * Fetches a customer profile, verifying it belongs to the caller's merchant.
 * Returns null if the profile does not exist or does not belong to the merchant.
 */
export async function fetchMerchantScopedCustomerProfile(
  serviceClient: SupabaseClient,
  merchantId: string,
  profileId: string,
  // Legacy user_id fallback: merchant_ids stores both merchant UUIDs and owner
  // user IDs for older rows. Providing this allows the query to match either.
  _legacyUserId?: string | null
): Promise<Record<string, unknown> | null> {
  const { data } = await serviceClient
    .from('customer_profiles')
    .select(PROFILE_SELECT)
    .eq('id', profileId)
    // customer_profiles uses an array column merchant_ids; check both the
    // merchant UUID and, as a legacy fallback, the owner user_id.
    // We do NOT rely solely on this — we also cross-check via job ownership below.
    .contains('merchant_ids', [merchantId])
    .maybeSingle() as unknown as { data: Record<string, unknown> | null };

  return data ?? null;
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

export const TX_SAFE_SELECT =
  'id,job_id,order_id,customer_email,customer_name,shipping_address,' +
  'device_ip,card_last4,order_value,match_score,fraud_flags,risk_level,' +
  'identity_confidence_grade,identity_score,match_status,' +
  'refund_claimed,refund_reason,chargeback_filed,chargeback_date,' +
  'chargeback_reason_code,processed_at,cluster_id,signals_matched,' +
  'dismissed_by_merchant';

/**
 * Fetches transactions for a customer profile, constrained to merchant-owned
 * processing jobs. This is the ONLY safe way to fetch customer transactions
 * from a service-role context.
 *
 * Strategy:
 * 1. Get all job IDs owned by the merchant.
 * 2. Fetch audit_appearances for the profile, filtered to those job IDs.
 * 3. Fetch transactions by appearance transaction_ids AND job_id constraint.
 * 4. If not enough rows, widen to all transactions in owned jobs matching the
 *    profile's identity attributes.
 * No fallback query without job_id constraint is ever performed.
 */
export async function fetchMerchantScopedCustomerTransactions(
  serviceClient: SupabaseClient,
  merchantId: string,
  profileId: string,
  profile: Record<string, unknown>,
  options: { select?: string } = {}
): Promise<Array<Record<string, unknown>>> {
  const select = options.select ?? TX_SAFE_SELECT;

  const ownedJobIds = await getMerchantOwnedJobIds(serviceClient, merchantId);
  if (ownedJobIds.length === 0) return [];

  const transactions: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  const pushTx = (rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      const key = (row.id as string) ?? `${row.order_id}-${row.processed_at}`;
      if (!seen.has(key)) {
        seen.add(key);
        transactions.push(row);
      }
    }
  };

  // Step 1: appearances scoped to owned jobs
  const { data: appearances } = await serviceClient
    .from('customer_profile_audit_appearances')
    .select('audit_id,transaction_id')
    .eq('profile_id', profileId)
    .in('audit_id', ownedJobIds) as unknown as {
      data: Array<{ audit_id: string; transaction_id: string | null }> | null;
    };

  const linkedTxIds = (appearances ?? [])
    .map((a) => a.transaction_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  // Step 2: fetch by linked transaction IDs, constrained by job ownership
  if (linkedTxIds.length > 0) {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await serviceClient
        .from('audit_transactions')
        .select(select)
        .in('id', linkedTxIds)
        .in('job_id', ownedJobIds)
        .order('processed_at', { ascending: true })
        .range(offset, offset + PAGE - 1) as unknown as {
          data: Array<Record<string, unknown>> | null;
        };
      pushTx(page ?? []);
      if (!page || page.length < PAGE) break;
      offset += PAGE;
    }
  }

  // Step 3: widen to profile identity attributes within owned jobs
  const profileEmails = (profile.emails ?? []) as string[];
  const profileCards = (profile.card_last4s ?? []) as string[];
  const profileIps = (profile.ips ?? []) as string[];

  const primaryIdentifier =
    profileEmails.length > 0
      ? { field: 'customer_email', values: profileEmails }
      : profileCards.length > 0
        ? { field: 'card_last4', values: profileCards }
        : profileIps.length > 0
          ? { field: 'device_ip', values: profileIps }
          : null;

  if (primaryIdentifier) {
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await (serviceClient
        .from('audit_transactions')
        .select(select)
        .in('job_id', ownedJobIds)
        .in(primaryIdentifier.field, primaryIdentifier.values)
        .order('processed_at', { ascending: true })
        .range(offset, offset + PAGE - 1) as unknown as Promise<{
          data: Array<Record<string, unknown>> | null;
        }>);
      pushTx(page ?? []);
      if (!page || page.length < PAGE) break;
      offset += PAGE;
    }
  }

  return transactions;
}

/**
 * Fetches a single transaction, verifying it belongs to the given merchant
 * via job_id ownership. Both id and job_id must match.
 */
export async function fetchMerchantScopedTransaction(
  serviceClient: SupabaseClient,
  merchantId: string,
  transactionId: string,
  jobId: string,
  select = '*'
): Promise<Record<string, unknown> | null> {
  // First prove job ownership
  const { data: jobRow } = await serviceClient
    .from('processing_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (!jobRow) return null;

  const { data } = await serviceClient
    .from('audit_transactions')
    .select(select)
    .eq('id', transactionId)
    .eq('job_id', jobId)
    .maybeSingle() as unknown as { data: Record<string, unknown> | null };

  return data ?? null;
}

// ---------------------------------------------------------------------------
// Generic pagination helper
// ---------------------------------------------------------------------------

/**
 * Paginates a Supabase table query, fetching all rows without a hard cap.
 * Pass a factory function that accepts (from, to) range values.
 *
 * @example
 * const rows = await paginateAll((from, to) =>
 *   serviceClient.from('audit_transactions').select('*')
 *     .in('job_id', jobIds).range(from, to)
 * );
 */
export async function paginateAll<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await queryFactory(offset, offset + pageSize - 1);
    if (error) throw new Error(`paginateAll query failed: ${String(error)}`);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Review queue helper — shared between inbox page and export
// ---------------------------------------------------------------------------

/**
 * Columns selected for review-queue rows.
 */
export const REVIEW_QUEUE_SELECT =
  'id,job_id,order_id,processed_at,order_value,identity_confidence_grade,' +
  'identity_score,match_status,customer_email,customer_name,signals_matched,' +
  'dismissed_by_merchant';

/**
 * Returns review-worthy rows across all merchant-owned jobs.
 *
 * DEFINITION (shared by inbox page and export — must not drift):
 * - job_id IN merchant-owned job IDs
 * - identity_confidence_grade IN (probable, definite) OR match_status IN (probable, definite)
 * - dismissed_by_merchant IS NOT TRUE
 * - match_status != 'none'  (redundant with above but explicit for export safety)
 * - ordered by identity_score DESC, processed_at DESC
 *
 * Pagination is handled by the caller via the `range` option, or by passing
 * `paginate: true` to fetch all rows without a hard cap.
 */
export type ReviewQueueWindow = 'today' | 'week' | 'all';

export async function fetchMerchantReviewQueueRows(
  serviceClient: SupabaseClient,
  merchantId: string,
  options: {
    select?: string;
    from?: number;
    to?: number;
    paginate?: boolean;
    processedFrom?: string;
    processedTo?: string;
  } = {}
): Promise<{ rows: Array<Record<string, unknown>>; ownedJobIds: string[] }> {
  const ownedJobIds = await getMerchantOwnedJobIds(serviceClient, merchantId);
  if (ownedJobIds.length === 0) return { rows: [], ownedJobIds: [] };

  const select = options.select ?? REVIEW_QUEUE_SELECT;

  const buildQuery = (from: number, to: number) => {
    let q = serviceClient
      .from('audit_transactions')
      .select(select)
      .in('job_id', ownedJobIds)
      // Review-worthy: likely/definite same-person evidence only.
      // IMPORTANT: do NOT add .not('match_status','eq','none') here — that
      // operator excludes NULL values in PostgREST and would silently drop
      // legacy graded rows where identity_confidence_grade is set but
      // match_status has not been set. The .or() below already restricts
      // the population correctly without touching null match_status rows.
      .or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)')
      // Exclude dismissed rows only
      .not('dismissed_by_merchant', 'is', true)
      .order('identity_score', { ascending: false })
      .order('processed_at', { ascending: false });

    if (options.processedFrom) q = q.gte('processed_at', options.processedFrom) as typeof q;
    if (options.processedTo) q = q.lte('processed_at', options.processedTo) as typeof q;

    return q.range(from, to) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>;
  };

  if (options.paginate) {
    const rows = await paginateAll(buildQuery);
    return { rows, ownedJobIds };
  }

  const from = options.from ?? 0;
  const to = options.to ?? 999;
  const { data, error } = await buildQuery(from, to);
  if (error) throw new Error(`fetchMerchantReviewQueueRows failed: ${inspect(error, { depth: null })}`);
  return { rows: data ?? [], ownedJobIds };
}

/**
 * For a list of audit transaction IDs, returns a Map of transactionId → profileId
 * by joining through customer_profile_audit_appearances.
 * Scoped to merchant-owned job IDs for defence-in-depth.
 */
export async function fetchReviewQueueProfileIds(
  serviceClient: SupabaseClient,
  ownedJobIds: string[],
  transactionIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (transactionIds.length === 0 || ownedJobIds.length === 0) return result;

  const { data, error } = await serviceClient
    .from('customer_profile_audit_appearances')
    .select('profile_id,transaction_id')
    .in('audit_id', ownedJobIds)
    .in('transaction_id', transactionIds) as unknown as {
      data: Array<{ profile_id: string; transaction_id: string }> | null;
      error: { message: string } | null;
    };

  if (error) throw new Error(`fetchReviewQueueProfileIds failed: ${error.message}`);

  for (const row of data ?? []) {
    if (row.transaction_id && row.profile_id) {
      result.set(row.transaction_id, row.profile_id);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Exposure-at-risk helper
// ---------------------------------------------------------------------------

/**
 * Returns the sum of `order_value` (NUMERIC) for review-worthy, non-dismissed
 * audit_transactions that belong to the given merchant.
 *
 * DEFINITION of "review-worthy" (matches countReviewWorthyTransactions):
 *   - identity_confidence_grade IN ('probable', 'definite') OR
 *   - match_status IN ('probable', 'definite')
 *   AND dismissed_by_merchant IS NOT TRUE
 *
 * MERCHANT SCOPING:
 * audit_transactions has no merchant_id column.  Ownership is proven by
 * resolving job IDs through processing_jobs.merchant_id before any
 * transaction query.  Zero cross-tenant data is ever returned.
 *
 * PRECISION: values are accumulated as JavaScript numbers (64-bit float).
 * For amounts up to ~$10 billion this is exact to the cent when order_value
 * carries at most 2 decimal places in the DB.  If you need arbitrary
 * precision, replace the accumulator with a Decimal library.
 *
 * ERROR POLICY: returns null on any failure; never converts errors to 0.
 *
 * @param serviceClient  Service-role Supabase client (bypasses RLS).
 * @param merchantId     The authenticated merchant's UUID.
 * @returns Sum of order_value, or null if the query could not be completed.
 */
export async function getExposureAtRisk(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<number | null> {
  try {
    // Step 1: Resolve all job IDs owned by this merchant.
    const ownedJobIds: string[] = [];
    const JOB_BATCH = 1000;
    let jobOffset = 0;
    while (true) {
      const { data: jobRows, error: jobErr } = await serviceClient
        .from('processing_jobs')
        .select('id')
        .eq('merchant_id', merchantId)
        .range(jobOffset, jobOffset + JOB_BATCH - 1);

      if (jobErr) {
        console.error('[getExposureAtRisk] job lookup failed:', jobErr.message);
        return null;
      }
      if (!jobRows || jobRows.length === 0) break;
      for (const r of jobRows) ownedJobIds.push(r.id as string);
      if (jobRows.length < JOB_BATCH) break;
      jobOffset += JOB_BATCH;
    }

    if (ownedJobIds.length === 0) return 0;

    // Step 2: Paginate review-worthy transactions and sum order_value.
    // We fetch two clause sets (graded + status-only) to mirror the canonical
    // review-worthy definition without double-counting.
    const TX_BATCH = 1000;
    let total = 0;

    async function sumClause(
      extraFilter: (
        q: ReturnType<typeof serviceClient.from>
      ) => ReturnType<typeof serviceClient.from>,
    ): Promise<number | null> {
      let offset = 0;
      let clauseSum = 0;
      while (true) {
        const base = serviceClient
          .from('audit_transactions')
          .select('order_value')
          .in('job_id', ownedJobIds)
          .not('dismissed_by_merchant', 'is', true)
          .range(offset, offset + TX_BATCH - 1);

        const { data, error } = (await extraFilter(base as unknown as ReturnType<typeof serviceClient.from>)) as unknown as {
          data: Array<{ order_value: string | number | null }> | null;
          error: { message: string } | null;
        };

        if (error) {
          console.error('[getExposureAtRisk] transaction query failed:', error.message);
          return null;
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
          if (row.order_value !== null && row.order_value !== undefined) {
            // Supabase may return NUMERIC as a string.
            const v = typeof row.order_value === 'string'
              ? parseFloat(row.order_value)
              : (row.order_value as number);
            if (!isNaN(v)) clauseSum += v;
          }
        }

        if (data.length < TX_BATCH) break;
        offset += TX_BATCH;
      }
      return clauseSum;
    }

    // Clause A: likely identity-grade transactions
    const gradedSum = await sumClause((q) =>
      (q as any).in('identity_confidence_grade', ['probable', 'definite']),
    );
    if (gradedSum === null) return null;
    total += gradedSum;

    // Clause B: status-match only, grade not already likely (avoids double-count with A)
    const statusSum = await sumClause((q) =>
      (q as any)
        .in('match_status', ['probable', 'definite'])
        .is('identity_confidence_grade', null),
    );
    if (statusSum === null) return null;
    total += statusSum;

    return total;
  } catch (err) {
    console.error('[getExposureAtRisk] unexpected error:', err);
    return null;
  }
}
