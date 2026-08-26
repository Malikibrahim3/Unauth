import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';

export type WorkspaceDeletionJob = Database['public']['Tables']['workspace_deletion_jobs']['Row'];
export type WorkspaceDeletionReceipt = Database['public']['Tables']['workspace_deletion_receipts']['Row'];
export type WorkspaceDeletionStage = 'preflight' | 'storage_cleanup' | 'database_cleanup' | 'verification' | 'completed';

type ServiceClient = SupabaseClient<Database>;

export type StorageTarget = {
  bucket: string;
  prefix?: string;
  paths?: string[];
};

export type WorkspaceDeletionPreflight = {
  workspaceName: string;
  requestedAt: string;
  rowCounts: Record<string, number>;
  storageTargetCount: number;
};

type WorkspaceStorageRows = {
  evidencePackages: Array<{ pdf_storage_path: string | null }>;
  claimEvidence: Array<{ storage_path: string | null }>;
  evidenceItems: Array<{ storage_path: string | null }>;
  recoveryClaimPacks: Array<{ pdf_storage_path: string | null; zip_storage_path: string | null }>;
  integrationDocuments: Array<{ file_path: string | null }>;
  agreements: Array<{ document_url: string | null }>;
  packConfirmations: Array<{ photo_url: string | null }>;
  syncJobs: Array<{ storage_path: string | null }>;
};

export type WorkspaceDeletionStageAdapter = {
  start(stage: Exclude<WorkspaceDeletionStage, 'preflight' | 'completed'>): Promise<void>;
  completeStorage(): Promise<void>;
  completeDatabase(): Promise<void>;
  verify(): Promise<Record<string, Json | undefined>>;
  finalize(verification: Record<string, Json | undefined>): Promise<WorkspaceDeletionReceipt>;
  fail(stage: Exclude<WorkspaceDeletionStage, 'preflight' | 'completed'>, message: string): Promise<void>;
};

export class WorkspaceDeletionRunError extends Error {
  constructor(
    public readonly jobId: string,
    public readonly stage: Exclude<WorkspaceDeletionStage, 'preflight' | 'completed'>,
    message: string,
  ) {
    super(message);
    this.name = 'WorkspaceDeletionRunError';
  }
}

/**
 * Pure stage coordinator used by both the route and failure/resume tests. A
 * persisted stage advances only after its operation succeeds, so a retry
 * starts at the failed boundary and never repeats a completed destructive step.
 */
export async function runWorkspaceDeletionStages(
  job: Pick<WorkspaceDeletionJob, 'id' | 'stage' | 'status'>,
  adapter: WorkspaceDeletionStageAdapter,
): Promise<WorkspaceDeletionReceipt | null> {
  if (job.status === 'completed' || job.stage === 'completed') return null;

  const persistedStage = job.stage === 'preflight' ? 'storage_cleanup' : job.stage;
  if (!['storage_cleanup', 'database_cleanup', 'verification'].includes(persistedStage)) {
    throw new Error(`Unsupported workspace deletion stage: ${persistedStage}`);
  }
  let stage = persistedStage as Exclude<WorkspaceDeletionStage, 'preflight' | 'completed'>;

  try {
    if (stage === 'storage_cleanup') {
      await adapter.start(stage);
      await adapter.completeStorage();
      stage = 'database_cleanup';
    }
    if (stage === 'database_cleanup') {
      await adapter.start(stage);
      await adapter.completeDatabase();
      stage = 'verification';
    }
    await adapter.start('verification');
    const verification = await adapter.verify();
    return await adapter.finalize(verification);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await adapter.fail(stage, message);
    throw new WorkspaceDeletionRunError(job.id, stage, message);
  }
}

function normalizeObjectPath(value: string | null | undefined, bucket: string): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) return candidate.replace(/^\/+/, '');
  try {
    const pathname = new URL(candidate).pathname;
    const marker = `/storage/v1/object/`;
    const objectIndex = pathname.indexOf(marker);
    if (objectIndex < 0) return null;
    const encodedObject = pathname.slice(objectIndex + marker.length).replace(/^(public|sign|authenticated)\//, '');
    const bucketPrefix = `${bucket}/`;
    if (!encodedObject.startsWith(bucketPrefix)) return null;
    return decodeURIComponent(encodedObject.slice(bucketPrefix.length));
  } catch {
    return null;
  }
}

function uniqueObjectPaths(values: Array<string | null | undefined>, bucket: string): string[] {
  return [...new Set(values
    .map((value) => normalizeObjectPath(value, bucket))
    .filter((path): path is string => Boolean(path)))];
}

/**
 * Storage prefixes must be merchant-scoped. Legacy user-prefixed objects are
 * deleted only by their exact database path so deleting one workspace can
 * never remove another workspace owned by the same user.
 */
export function buildWorkspaceStorageManifest(
  merchantId: string,
  rows: WorkspaceStorageRows,
): StorageTarget[] {
  const evidencePaths = uniqueObjectPaths([
    ...rows.evidencePackages.map((row) => row.pdf_storage_path),
    ...rows.claimEvidence.map((row) => row.storage_path),
    ...rows.evidenceItems.map((row) => row.storage_path),
    ...rows.recoveryClaimPacks.flatMap((row) => [row.pdf_storage_path, row.zip_storage_path]),
  ], STORAGE_BUCKETS.EVIDENCE_PACKAGES);
  const documentPaths = uniqueObjectPaths([
    ...rows.integrationDocuments.map((row) => row.file_path),
    ...rows.agreements.map((row) => row.document_url),
  ], STORAGE_BUCKETS.INTEGRATION_DOCUMENTS);
  const photoPaths = uniqueObjectPaths(
    rows.packConfirmations.map((row) => row.photo_url),
    STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS,
  );
  const csvPaths = uniqueObjectPaths(
    rows.syncJobs.map((row) => row.storage_path),
    STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS,
  );

  return [
    { bucket: STORAGE_BUCKETS.EVIDENCE_PACKAGES, prefix: `api-keys/${merchantId}` },
    { bucket: STORAGE_BUCKETS.EVIDENCE_PACKAGES, prefix: `${merchantId}/evidence` },
    { bucket: STORAGE_BUCKETS.EVIDENCE_PACKAGES, prefix: `recovery-claim-packs/${merchantId}` },
    { bucket: STORAGE_BUCKETS.INTEGRATION_DOCUMENTS, prefix: merchantId },
    { bucket: STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS, prefix: merchantId },
    { bucket: STORAGE_BUCKETS.INVESTIGATION_EVIDENCE, prefix: merchantId },
    { bucket: STORAGE_BUCKETS.EVIDENCE_PACKAGES, paths: evidencePaths },
    { bucket: STORAGE_BUCKETS.INTEGRATION_DOCUMENTS, paths: documentPaths },
    { bucket: STORAGE_BUCKETS.PACK_CONFIRMATION_PHOTOS, paths: photoPaths },
    { bucket: STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS, paths: csvPaths },
  ].filter((target) => Boolean(target.prefix) || (target.paths?.length ?? 0) > 0);
}

async function countRows(client: ServiceClient, table: string, merchantId: string) {
  const untypedClient = client as unknown as SupabaseClient;
  const result = await untypedClient.from(table).select('*', { count: 'exact', head: true }).eq('merchant_id', merchantId);
  if (result.error) throw new Error(`${String(table)} preflight failed: ${result.error.message}`);
  return result.count ?? 0;
}

export async function buildWorkspaceDeletionPreflight(
  client: ServiceClient,
  merchantId: string,
): Promise<{ preflight: WorkspaceDeletionPreflight; storageManifest: StorageTarget[] }> {
  const [
    merchantResult,
    memberCount,
    sourceCount,
    caseCount,
    lossCount,
    recoveryCount,
    ledgerCount,
    notificationCount,
    evidenceResult,
    claimEvidenceResult,
    evidenceItemsResult,
    recoveryClaimPacksResult,
    documentResult,
    agreementResult,
    photoResult,
    syncJobsResult,
  ] = await Promise.all([
    client.from(TABLES.MERCHANTS).select('name').eq('id', merchantId).maybeSingle(),
    countRows(client, TABLES.MERCHANT_MEMBERS, merchantId),
    countRows(client, TABLES.SOURCE_RECORDS, merchantId),
    countRows(client, TABLES.MERCHANT_CLAIMS, merchantId),
    countRows(client, TABLES.LOSS_CASES, merchantId),
    countRows(client, TABLES.RECOVERY_CASES, merchantId),
    countRows(client, TABLES.CASE_FINANCIAL_ENTRIES, merchantId),
    countRows(client, TABLES.NOTIFICATIONS, merchantId),
    client.from(TABLES.EVIDENCE_PACKAGES).select('pdf_storage_path').eq('merchant_id', merchantId),
    client.from(TABLES.CLAIM_EVIDENCE).select('storage_path').eq('merchant_id', merchantId),
    client.from(TABLES.EVIDENCE_ITEMS).select('storage_path').eq('merchant_id', merchantId),
    client.from(TABLES.RECOVERY_CLAIM_PACKS).select('pdf_storage_path,zip_storage_path').eq('merchant_id', merchantId),
    client.from(TABLES.INTEGRATION_DOCUMENTS).select('file_path').eq('merchant_id', merchantId),
    client.from(TABLES.AGREEMENTS).select('document_url').eq('merchant_id', merchantId),
    client.from(TABLES.PACK_CONFIRMATIONS).select('photo_url').eq('merchant_id', merchantId),
    client.from(TABLES.PROCESSING_JOBS).select('storage_path').eq('merchant_id', merchantId),
  ]);

  if (merchantResult.error || !merchantResult.data) {
    throw new Error(`workspace preflight failed: ${merchantResult.error?.message ?? 'workspace not found'}`);
  }
  for (const result of [
    evidenceResult,
    claimEvidenceResult,
    evidenceItemsResult,
    recoveryClaimPacksResult,
    documentResult,
    agreementResult,
    photoResult,
    syncJobsResult,
  ]) {
    if (result.error) throw new Error(`storage manifest preflight failed: ${result.error.message}`);
  }

  const storageManifest = buildWorkspaceStorageManifest(merchantId, {
    evidencePackages: evidenceResult.data ?? [],
    claimEvidence: claimEvidenceResult.data ?? [],
    evidenceItems: evidenceItemsResult.data ?? [],
    recoveryClaimPacks: recoveryClaimPacksResult.data ?? [],
    integrationDocuments: documentResult.data ?? [],
    agreements: agreementResult.data ?? [],
    packConfirmations: photoResult.data ?? [],
    syncJobs: syncJobsResult.data ?? [],
  });

  return {
    preflight: {
      workspaceName: merchantResult.data.name,
      requestedAt: new Date().toISOString(),
      rowCounts: {
        members: memberCount,
        sourceRecords: sourceCount,
        cases: caseCount,
        losses: lossCount,
        recoveries: recoveryCount,
        ledgerEntries: ledgerCount,
        notifications: notificationCount,
      },
      storageTargetCount: storageManifest.length,
    },
    storageManifest,
  };
}

async function listStoragePrefix(client: ServiceClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`storage list failed for ${bucket}/${prefix}: ${error.message}`);
    const objects = data ?? [];
    const folders: string[] = [];
    for (const object of objects) {
      const objectPath = prefix ? `${prefix}/${object.name}` : object.name;
      if (object.id === null) folders.push(objectPath);
      else files.push(objectPath);
    }
    for (const folder of folders) files.push(...await listStoragePrefix(client, bucket, folder));
    if (objects.length < 1000) break;
    offset += objects.length;
  }
  return files;
}

async function removePaths(client: ServiceClient, bucket: string, paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const { error } = await client.storage.from(bucket).remove(chunk);
    if (error) throw new Error(`storage remove failed for ${bucket}: ${error.message}`);
  }
}

async function storedObjectExists(client: ServiceClient, bucket: string, path: string) {
  const slash = path.lastIndexOf('/');
  const prefix = slash >= 0 ? path.slice(0, slash) : '';
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100, search: name });
  if (error) throw new Error(`storage verification failed for ${bucket}/${path}: ${error.message}`);
  return (data ?? []).some((object) => object.name === name && object.id !== null);
}

export async function cleanupWorkspaceStorage(client: ServiceClient, targets: StorageTarget[]) {
  for (const target of targets) {
    const prefixPaths = target.prefix
      ? await listStoragePrefix(client, target.bucket, target.prefix)
      : [];
    await removePaths(client, target.bucket, [...prefixPaths, ...(target.paths ?? [])]);
  }

  for (const target of targets) {
    if (target.prefix && (await listStoragePrefix(client, target.bucket, target.prefix)).length > 0) {
      throw new Error(`storage verification found remaining objects in ${target.bucket}/${target.prefix}`);
    }
    for (const path of target.paths ?? []) {
      if (await storedObjectExists(client, target.bucket, path)) {
        throw new Error(`storage verification found remaining object ${target.bucket}/${path}`);
      }
    }
  }
}

export async function createWorkspaceDeletionJob(
  client: ServiceClient,
  input: { merchantId: string; actorUserId: string; idempotencyKey: string },
): Promise<WorkspaceDeletionJob> {
  const { preflight, storageManifest } = await buildWorkspaceDeletionPreflight(
    client,
    input.merchantId,
  );
  const insert = await client.from(TABLES.WORKSPACE_DELETION_JOBS).insert({
    merchant_reference: input.merchantId,
    actor_user_reference: input.actorUserId,
    idempotency_key: input.idempotencyKey,
    preflight: preflight as unknown as Json,
    storage_manifest: storageManifest as unknown as Json,
    progress: { preflight_completed_at: new Date().toISOString() },
  }).select('*').single();
  if (!insert.error) return insert.data;
  if (insert.error.code !== '23505') throw new Error(`workspace deletion request failed: ${insert.error.message}`);
  const existing = await client.from(TABLES.WORKSPACE_DELETION_JOBS).select('*')
    .eq('actor_user_reference', input.actorUserId)
    .eq('merchant_reference', input.merchantId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (existing.error || !existing.data) {
    throw new Error(`workspace deletion retry lookup failed: ${existing.error?.message ?? 'job not found'}`);
  }
  return existing.data;
}

export async function getWorkspaceDeletionJob(
  client: ServiceClient,
  jobId: string,
  actorUserId: string,
): Promise<WorkspaceDeletionJob | null> {
  const result = await client.from(TABLES.WORKSPACE_DELETION_JOBS).select('*')
    .eq('id', jobId)
    .eq('actor_user_reference', actorUserId)
    .maybeSingle();
  if (result.error) throw new Error(`workspace deletion job lookup failed: ${result.error.message}`);
  return result.data;
}

export async function resumeWorkspaceDeletionJob(
  client: ServiceClient,
  initialJob: WorkspaceDeletionJob,
): Promise<WorkspaceDeletionJob> {
  let current = initialJob;
  const save = async (patch: Database['public']['Tables']['workspace_deletion_jobs']['Update']) => {
    const result = await client.from(TABLES.WORKSPACE_DELETION_JOBS).update(patch)
      .eq('id', current.id)
      .eq('actor_user_reference', current.actor_user_reference)
      .select('*')
      .single();
    if (result.error) throw new Error(`workspace deletion progress write failed: ${result.error.message}`);
    current = result.data;
  };

  const storageTargets = Array.isArray(current.storage_manifest)
    ? current.storage_manifest as unknown as StorageTarget[]
    : [];

  await runWorkspaceDeletionStages(current, {
    async start(stage) {
      await save({ status: 'running', stage, attempts: current.attempts + 1, last_error: null });
    },
    async completeStorage() {
      await cleanupWorkspaceStorage(client, storageTargets);
      await save({
        stage: 'database_cleanup',
        progress: {
          ...(current.progress as Record<string, Json | undefined>),
          storage_cleanup_completed_at: new Date().toISOString(),
          storage_targets_verified: storageTargets.length,
        },
      });
    },
    async completeDatabase() {
      const result = await client.rpc('purge_workspace_database_v1', {
        p_job_id: current.id,
        p_merchant_id: current.merchant_reference,
        p_actor_user_id: current.actor_user_reference,
      });
      if (result.error) throw new Error(`workspace database cleanup failed: ${result.error.message}`);
      const refreshed = await getWorkspaceDeletionJob(client, current.id, current.actor_user_reference);
      if (!refreshed) throw new Error('workspace deletion job disappeared after database cleanup');
      current = refreshed;
    },
    async verify() {
      for (const target of storageTargets) {
        if (target.prefix && (await listStoragePrefix(client, target.bucket, target.prefix)).length > 0) {
          throw new Error(`workspace storage verification failed for ${target.bucket}/${target.prefix}`);
        }
        for (const path of target.paths ?? []) {
          if (await storedObjectExists(client, target.bucket, path)) {
            throw new Error(`workspace storage verification failed for ${target.bucket}/${path}`);
          }
        }
      }
      const merchant = await client.from(TABLES.MERCHANTS).select('id').eq('id', current.merchant_reference).maybeSingle();
      if (merchant.error) throw new Error(`workspace row verification failed: ${merchant.error.message}`);
      if (merchant.data) throw new Error('workspace row still exists after database cleanup');
      return {
        merchant_row_absent: true,
        storage_targets_verified: storageTargets.length,
        auth_identity_retained: true,
      };
    },
    async finalize(verification) {
      const result = await client.rpc('finalize_workspace_deletion_v1', {
        p_job_id: current.id,
        p_verification: verification,
      });
      if (result.error) throw new Error(`workspace deletion receipt failed: ${result.error.message}`);
      return result.data;
    },
    async fail(stage, message) {
      await save({ status: 'failed', stage, last_error: message.slice(0, 2000) });
    },
  });

  const completed = await getWorkspaceDeletionJob(client, current.id, current.actor_user_reference);
  if (!completed) throw new Error('completed workspace deletion job is unavailable');
  return completed;
}
