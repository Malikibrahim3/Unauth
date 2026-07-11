import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, createServiceClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { enforceRateLimit, limitFromEnv, rateLimitKey, getClientIp } from '@/lib/ratelimit';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

async function listStoragePaths(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  current: string
): Promise<string[]> {
  const { data: objects, error } = await service.storage
    .from(bucket)
    .list(current, { limit: 1000 });
  if (error) {
    console.warn(`[account-delete] non-fatal storage list: ${bucket}/${current}:`, error.message);
    return [];
  }

  const filePaths: string[] = [];
  const subdirs: string[] = [];
  for (const object of objects ?? []) {
    const path = `${current}/${object.name}`;
    if (object.id === null) {
      subdirs.push(path);
    } else {
      filePaths.push(path);
    }
  }

  const nested = await Promise.all(
    subdirs.map((dir) => listStoragePaths(service, bucket, dir))
  );
  return [...filePaths, ...nested.flat()];
}

async function removeStoragePrefix(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefix: string
) {
  const paths = await listStoragePaths(service, bucket, prefix);
  const chunks = Array.from({ length: Math.ceil(paths.length / 100) }, (_, i) =>
    paths.slice(i * 100, i * 100 + 100)
  );
  await Promise.all(
    chunks.map(async (chunk) => {
      const { error } = await service.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
      }
    })
  );
}

async function removeStorageObjects(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  paths: string[]
) {
  const uniquePaths = Array.from(new Set(paths.filter((path) => path.length > 0)));
  const chunks = Array.from({ length: Math.ceil(uniquePaths.length / 100) }, (_, i) =>
    uniquePaths.slice(i * 100, i * 100 + 100)
  );
  await Promise.all(
    chunks.map(async (chunk) => {
      const { error } = await service.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`[account-delete] non-fatal storage remove: ${bucket}:`, error.message);
      }
    })
  );
}

const CURRENT_V2_MERCHANT_DELETE_TABLES: string[] = [
  // Canonical entity model (Phase 3) — children before parents. All have
  // merchant_id; FKs are cascade/set-null so any residual dependents follow.
  'source_tracking_events',
  'source_messages',
  'source_order_lines',
  'source_transactions',
  'source_payments',
  'source_replacements',
  'source_returns',
  'source_shipments',
  'ingestion_field_errors',
  'merchant_customers',
  'evidence_download_tokens',
  'profile_view_tokens',
  'agreement_rule_evaluations',
  'accountability_events',
  'recovery_tasks',
  'loss_sources',
  'evidence_items',
  'agreement_rules',
  'agreement_clauses',
  'document_upload_jobs',
  'agreements',
  'evidence_packages',
  'webhook_logs',
  'unmatched_correspondence',
  'external_clarification_requests',
  'external_correspondence',
  'loss_case_evidence',
  'loss_case_events',
  'loss_cases',
  'recovery_case_events',
  'recovery_cases',
  'case_clarification_requests',
  'integration_evidence_items',
  'pack_confirmations',
  'category_applicability',
  'claim_evidence',
  'claim_events',
  'rule_evaluations',
  'identity_catch_events',
  'source_ticket_events',
  'source_refunds',
  'source_fulfillments',
  'source_disputes',
  'checkout_signal_order_links',
  'identity_signals',
  'identity_edges',
  'identity_notes',
  'merchant_identity_state',
  'support_payout_cases',
  'partner_recovery_rules',
  'partners',
  'merchant_rules',
  'checkout_signals',
  'source_orders',
  'source_addresses',
  'source_tickets',
  'source_customers',
  'store_connections',
  'helpdesk_connections',
  'extracted_partner_terms',
  'integration_documents',
  'integration_credentials',
  'merchant_integrations',
  'correspondence_automation_settings',
  'sync_jobs',
  'merchant_widget_tokens',
  'merchant_api_keys',
  'access_audit_log',
  'user_action_log',
  'user_permission_grants',
  'merchant_users',
  'merchant_credits',
  'merchant_subscriptions',
  'context_credit_events',
  'credit_topup_log',
  'billing_events_log',
];

async function fetchMerchantIds(
  service: ReturnType<typeof createServiceClient>,
  table: string,
  merchantId: string,
): Promise<string[]> {
  const { data, error } = await service
    .from(table)
    .select('id')
    .eq('merchant_id', merchantId);
  if (error) throw new Error(`${table} id lookup failed: ${error.message}`);
  return ((data as Array<{ id: string }> | null) ?? []).map((row) => row.id);
}

async function deleteInChunks(
  service: ReturnType<typeof createServiceClient>,
  table: string,
  column: string,
  values: string[],
) {
  if (values.length === 0) return;
  const chunks = Array.from({ length: Math.ceil(values.length / 500) }, (_, i) =>
    values.slice(i * 500, i * 500 + 500)
  );
  for (const chunk of chunks) {
    const { error } = await service.from(table).delete().in(column, chunk);
    if (error) throw new Error(`${table} delete failed: ${error.message}`);
  }
}

async function deleteMerchantRows(
  service: ReturnType<typeof createServiceClient>,
  table: string,
  merchantId: string,
) {
  const { error } = await service.from(table).delete().eq('merchant_id', merchantId);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    rateLimitKey('account-delete', getClientIp(request.headers)),
    limitFromEnv('RL_ACCOUNT_DELETE_PER_HOUR', 3, 3600)
  );
  if (limited) return limited;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirm?: string };
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation phrase required.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
  if (denied) return denied;

  // Account deletion is owner-only. Use the resolved caller context so team
  // members cannot delete a merchant account by sharing the owner's session UI.
  const merchantId = ctx.merchantId;

  if (merchantId) {
    try {
      const [
        { data: evidencePaths, error: evidencePathError },
        { data: claimEvidencePaths, error: claimEvidencePathError },
        { data: integrationDocumentPaths, error: integrationDocumentPathError },
        { data: agreementPaths, error: agreementPathError },
        { data: packPhotoPaths, error: packPhotoPathError },
      ] = await Promise.all([
        service.from(TABLES.EVIDENCE_PACKAGES).select('pdf_storage_path').eq('merchant_id', merchantId),
        service.from('claim_evidence').select('storage_path').eq('merchant_id', merchantId),
        service.from(TABLES.INTEGRATION_DOCUMENTS).select('file_path').eq('merchant_id', merchantId),
        service.from(TABLES.AGREEMENTS).select('document_url').eq('merchant_id', merchantId),
        service.from('pack_confirmations').select('photo_url').eq('merchant_id', merchantId),
      ]);
      const storageLookupError = evidencePathError ?? claimEvidencePathError ?? integrationDocumentPathError
        ?? agreementPathError ?? packPhotoPathError;
      if (storageLookupError) throw new Error(`storage metadata lookup failed: ${storageLookupError.message}`);

      await Promise.all([
        removeStoragePrefix(service, STORAGE_BUCKETS.EVIDENCE_PACKAGES, user.id),
        removeStoragePrefix(service, STORAGE_BUCKETS.EVIDENCE_PACKAGES, `api-keys/${merchantId}`),
        removeStoragePrefix(service, STORAGE_BUCKETS.INTEGRATION_DOCUMENTS, merchantId),
        removeStoragePrefix(service, STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS, merchantId),
        removeStorageObjects(
          service,
          STORAGE_BUCKETS.EVIDENCE_PACKAGES,
          [
            ...((evidencePaths as Array<{ pdf_storage_path: string | null }> | null) ?? []).map((row) => row.pdf_storage_path ?? ''),
            ...((claimEvidencePaths as Array<{ storage_path: string | null }> | null) ?? []).map((row) => row.storage_path ?? ''),
          ],
        ),
        removeStorageObjects(
          service,
          STORAGE_BUCKETS.INTEGRATION_DOCUMENTS,
          [
            ...((integrationDocumentPaths as Array<{ file_path: string | null }> | null) ?? []).map((row) => row.file_path ?? ''),
            ...((agreementPaths as Array<{ document_url: string | null }> | null) ?? []).map((row) => row.document_url ?? ''),
          ],
        ),
        removeStorageObjects(
          service,
          STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS,
          ((packPhotoPaths as Array<{ photo_url: string | null }> | null) ?? []).map((row) => row.photo_url ?? ''),
        ),
      ]);

      const supportPayoutCaseIds = await fetchMerchantIds(service, TABLES.MERCHANT_CLAIMS, merchantId);
      const syncJobIds = await fetchMerchantIds(service, TABLES.PROCESSING_JOBS, merchantId);

      await deleteInChunks(service, 'claim_outcomes', 'claim_id', supportPayoutCaseIds);
      await deleteInChunks(service, 'sync_job_chunks', 'job_id', syncJobIds);

      // Source-agnostic foundation tables. domain_events and case_financial_entries
      // are append-only (their triggers block DELETE), and case_financial_entries
      // cascades from support_payout_cases — so this flag-gated purge MUST run
      // before the generic loop deletes support_payout_cases. One RPC removes all
      // 10 source-agnostic tables for the merchant in FK-safe order.
      const { error: purgeError } = await service.rpc('purge_merchant_source_agnostic', {
        p_merchant_id: merchantId,
      });
      if (purgeError) {
        throw new Error(`source-agnostic purge failed: ${purgeError.message}`);
      }

      for (const table of CURRENT_V2_MERCHANT_DELETE_TABLES) {
        await deleteMerchantRows(service, table, merchantId);
      }

      const { error: merchantDeleteError } = await service
        .from(TABLES.MERCHANTS)
        .delete()
        .eq('id', merchantId);
      if (merchantDeleteError) {
        throw new Error(`merchants delete failed: ${merchantDeleteError.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[account-delete] merchant purge failed:', message);
      return NextResponse.json(
        { error: 'Failed to delete all merchant data. Contact support@unauth.co.' },
        { status: 500 },
      );
    }
  }

  // Delete the auth user last — this invalidates all sessions.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[account-delete] auth.admin.deleteUser failed:', deleteError.message);
    return NextResponse.json({ error: 'Failed to delete account. Contact support@unauth.co.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
