import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertClaimEvidence } from '@/lib/integrations/canonicalEvidence';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { env } from '@/lib/utils/env';

export const MAX_INVESTIGATION_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const INVESTIGATION_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export type InvestigationAttachment = {
  id: string;
  merchant_id: string;
  support_payout_case_id: string;
  investigation_id: string;
  file_path: string | null;
  external_url: string | null;
  original_filename: string | null;
  safe_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  content_hash: string | null;
  safety_status: 'pending' | 'clean' | 'rejected' | 'failed';
  safety_detail: string | null;
  evidence_item_id: string | null;
  created_by: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

export type InvestigationAttachmentView = Omit<InvestigationAttachment, 'file_path'> & {
  download_url: string | null;
};

export function investigationAttachmentView(
  attachment: InvestigationAttachment,
): InvestigationAttachmentView {
  const { file_path: _privateStoragePath, ...safe } = attachment;
  return {
    ...safe,
    download_url:
      attachment.file_path && attachment.safety_status === 'clean'
        ? `/api/claims/${encodeURIComponent(attachment.support_payout_case_id)}/investigations/${encodeURIComponent(attachment.investigation_id)}/attachments/${encodeURIComponent(attachment.id)}/download`
        : null,
  };
}

export function safeInvestigationFileName(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'evidence';
}

export function attachmentMagicMatches(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'application/pdf') {
    return Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-';
  }
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }
  if (contentType === 'text/plain') {
    return !bytes.subarray(0, Math.min(bytes.length, 1024)).includes(0);
  }
  if (contentType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    );
  }
  if (contentType === 'image/webp') {
    return (
      Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF'
      && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0
  );
}

export function validatedInvestigationExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (hostname === 'localhost' || hostname.endsWith('.local')) return null;
    if (isIP(hostname) === 4 && isPrivateIpv4(hostname)) return null;
    if (isIP(hostname) === 6 && (hostname === '::1' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd'))) {
      return null;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export async function listInvestigationAttachments(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  investigationId: string,
): Promise<InvestigationAttachment[]> {
  const { data, error } = await client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('investigation_id', investigationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`investigation_attachments_list_failed: ${error.message}`);
  return (data ?? []) as InvestigationAttachment[];
}

export async function registerInvestigationFile(input: {
  client: SupabaseClient;
  merchantId: string;
  caseId: string;
  investigationId: string;
  actorUserId: string;
  idempotencyKey: string;
  file: File;
}): Promise<InvestigationAttachment> {
  if (
    input.file.size < 1
    || input.file.size > MAX_INVESTIGATION_ATTACHMENT_BYTES
    || !INVESTIGATION_ATTACHMENT_TYPES.has(input.file.type)
  ) {
    throw new Error('investigation_attachment_invalid_file');
  }
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  if (!attachmentMagicMatches(bytes, input.file.type)) {
    throw new Error('investigation_attachment_magic_mismatch');
  }
  const safeFilename = safeInvestigationFileName(input.file.name);
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const filePath = [
    input.merchantId,
    'investigations',
    input.investigationId,
    'quarantine',
    `${randomUUID()}-${safeFilename}`,
  ].join('/');
  const { error: uploadError } = await input.client.storage
    .from(STORAGE_BUCKETS.INVESTIGATION_EVIDENCE)
    .upload(filePath, bytes, {
      contentType: input.file.type,
      upsert: false,
    });
  if (uploadError) throw new Error(`investigation_attachment_upload_failed: ${uploadError.message}`);

  const { data, error } = await input.client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .insert({
      merchant_id: input.merchantId,
      support_payout_case_id: input.caseId,
      investigation_id: input.investigationId,
      file_path: filePath,
      original_filename: input.file.name.slice(0, 500),
      safe_filename: safeFilename,
      content_type: input.file.type,
      size_bytes: input.file.size,
      content_hash: contentHash,
      safety_status: 'pending',
      safety_detail: 'Awaiting malware scan',
      created_by: input.actorUserId,
      idempotency_key: input.idempotencyKey,
    })
    .select()
    .single();
  if (error) {
    await input.client.storage
      .from(STORAGE_BUCKETS.INVESTIGATION_EVIDENCE)
      .remove([filePath]);
    throw new Error(`investigation_attachment_register_failed: ${error.message}`);
  }
  return data as InvestigationAttachment;
}

export async function registerInvestigationLink(input: {
  client: SupabaseClient;
  merchantId: string;
  caseId: string;
  investigationId: string;
  actorUserId: string;
  idempotencyKey: string;
  externalUrl: string;
  label?: string | null;
}): Promise<InvestigationAttachment> {
  const externalUrl = validatedInvestigationExternalUrl(input.externalUrl);
  if (!externalUrl) throw new Error('investigation_attachment_invalid_url');
  const { data, error } = await input.client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .insert({
      merchant_id: input.merchantId,
      support_payout_case_id: input.caseId,
      investigation_id: input.investigationId,
      external_url: externalUrl,
      original_filename: input.label?.trim().slice(0, 500) || null,
      safety_status: 'clean',
      safety_detail: 'Validated HTTPS reference; remote contents were not fetched',
      created_by: input.actorUserId,
      idempotency_key: input.idempotencyKey,
    })
    .select()
    .single();
  if (error) throw new Error(`investigation_attachment_register_failed: ${error.message}`);
  const attachment = data as InvestigationAttachment;
  const evidenceId = stableEvidenceId(
    input.merchantId,
    'investigation',
    'investigation_response_link',
    attachment.id,
  );
  const evidence = await upsertClaimEvidence(input.client, {
    id: evidenceId,
    merchantId: input.merchantId,
    claimId: input.caseId,
    evidenceType: 'investigation_response_link',
    title: input.label?.trim() || 'Investigation response link',
    summary: 'Validated external HTTPS reference recorded by a merchant user.',
    sourceSystem: 'investigation',
    sourceRecordId: input.investigationId,
    externalUrl,
    structuredValue: { url: externalUrl },
    sourceMetadata: {
      source: 'investigation',
      migration_key: `investigation_attachment:${attachment.id}`,
      investigation_id: input.investigationId,
      attachment_id: attachment.id,
      safety_status: 'clean',
      remote_content_fetched: false,
    },
    createdBy: input.actorUserId,
  });
  const { data: linked, error: linkError } = await input.client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .update({ evidence_item_id: evidence.id })
    .eq('merchant_id', input.merchantId)
    .eq('id', attachment.id)
    .select()
    .single();
  if (linkError) throw new Error(`investigation_attachment_evidence_link_failed: ${linkError.message}`);
  return linked as InvestigationAttachment;
}

type MalwareScanVerdict = {
  verdict: 'clean' | 'malicious' | 'unknown';
  detail: string | null;
};

async function requestMalwareScan(input: {
  bytes: Uint8Array;
  contentType: string;
  contentHash: string | null;
  filename: string | null;
}): Promise<MalwareScanVerdict> {
  if (!env.INVESTIGATION_MALWARE_SCAN_URL || !env.INVESTIGATION_MALWARE_SCAN_TOKEN) {
    throw new Error('investigation_attachment_scanner_unconfigured');
  }
  const response = await fetch(env.INVESTIGATION_MALWARE_SCAN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.INVESTIGATION_MALWARE_SCAN_TOKEN}`,
      'Content-Type': input.contentType,
      ...(input.contentHash ? { 'X-Content-SHA256': input.contentHash } : {}),
      ...(input.filename ? { 'X-Filename': encodeURIComponent(input.filename) } : {}),
    },
    body: Buffer.from(input.bytes),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`investigation_attachment_scanner_failed:${response.status}`);
  }
  const body = await response.json().catch(() => null) as {
    verdict?: unknown;
    detail?: unknown;
  } | null;
  if (
    !body
    || !['clean', 'malicious', 'unknown'].includes(String(body.verdict))
  ) {
    throw new Error('investigation_attachment_scanner_invalid_response');
  }
  return {
    verdict: body.verdict as MalwareScanVerdict['verdict'],
    detail: typeof body.detail === 'string' ? body.detail.slice(0, 1000) : null,
  };
}

export async function scanInvestigationAttachment(
  client: SupabaseClient,
  attachment: InvestigationAttachment,
): Promise<InvestigationAttachment> {
  if (!attachment.file_path || !attachment.content_type) {
    throw new Error('investigation_attachment_scan_target_invalid');
  }
  const download = await client.storage
    .from(STORAGE_BUCKETS.INVESTIGATION_EVIDENCE)
    .download(attachment.file_path);
  if (download.error || !download.data) {
    throw new Error(
      `investigation_attachment_download_failed:${download.error?.message ?? 'missing_file'}`,
    );
  }
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (
    bytes.length < 1
    || bytes.length > MAX_INVESTIGATION_ATTACHMENT_BYTES
    || !attachmentMagicMatches(bytes, attachment.content_type)
  ) {
    const { data, error } = await client
      .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
      .update({
        safety_status: 'rejected',
        safety_detail: 'Stored file failed size or magic-byte verification',
      })
      .eq('merchant_id', attachment.merchant_id)
      .eq('id', attachment.id)
      .select()
      .single();
    if (error) throw new Error(`investigation_attachment_reject_failed:${error.message}`);
    return data as InvestigationAttachment;
  }

  let verdict: MalwareScanVerdict;
  try {
    verdict = await requestMalwareScan({
      bytes,
      contentType: attachment.content_type,
      contentHash: attachment.content_hash,
      filename: attachment.safe_filename,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'scanner_failed';
    await client
      .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
      .update({
        safety_status: 'failed',
        safety_detail: detail.slice(0, 1000),
      })
      .eq('merchant_id', attachment.merchant_id)
      .eq('id', attachment.id);
    throw error;
  }

  if (verdict.verdict !== 'clean') {
    const { data, error } = await client
      .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
      .update({
        safety_status: verdict.verdict === 'malicious' ? 'rejected' : 'failed',
        safety_detail: verdict.detail ?? (
          verdict.verdict === 'malicious'
            ? 'Malware scanner rejected the file'
            : 'Malware scanner returned no conclusive verdict'
        ),
      })
      .eq('merchant_id', attachment.merchant_id)
      .eq('id', attachment.id)
      .select()
      .single();
    if (error) throw new Error(`investigation_attachment_verdict_failed:${error.message}`);
    return data as InvestigationAttachment;
  }

  const evidenceId = stableEvidenceId(
    attachment.merchant_id,
    'investigation',
    'investigation_response_file',
    attachment.id,
  );
  const evidence = await upsertClaimEvidence(client, {
    id: evidenceId,
    merchantId: attachment.merchant_id,
    claimId: attachment.support_payout_case_id,
    evidenceType: 'investigation_response_file',
    title: attachment.safe_filename ?? 'Investigation response file',
    summary: 'Safety-scanned file supplied as investigation response evidence.',
    sourceSystem: 'investigation',
    sourceRecordId: attachment.investigation_id,
    storagePath: attachment.file_path,
    contentHash: attachment.content_hash,
    sourceMetadata: {
      source: 'investigation',
      migration_key: `investigation_attachment:${attachment.id}`,
      investigation_id: attachment.investigation_id,
      attachment_id: attachment.id,
      safety_status: 'clean',
      scanner_detail: verdict.detail,
    },
    createdBy: attachment.created_by,
  });
  const { data, error } = await client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .update({
      safety_status: 'clean',
      safety_detail: verdict.detail ?? 'Malware scan passed',
      evidence_item_id: evidence.id as string,
    })
    .eq('merchant_id', attachment.merchant_id)
    .eq('id', attachment.id)
    .select()
    .single();
  if (error) {
    throw new Error(`investigation_attachment_scan_completion_failed:${error.message}`);
  }
  return data as InvestigationAttachment;
}

export async function scanPendingInvestigationAttachments(
  client: SupabaseClient,
  options: { limit?: number } = {},
): Promise<{ scanned: number; clean: number; rejected: number; failed: number }> {
  const { data, error } = await client
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .select('*')
    .in('safety_status', ['pending', 'failed'])
    .not('file_path', 'is', null)
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(options.limit ?? 20, 1), 100));
  if (error) throw new Error(`investigation_attachment_scan_list_failed:${error.message}`);
  const result = { scanned: 0, clean: 0, rejected: 0, failed: 0 };
  for (const row of (data ?? []) as InvestigationAttachment[]) {
    result.scanned += 1;
    try {
      const scanned = await scanInvestigationAttachment(client, row);
      if (scanned.safety_status === 'clean') result.clean += 1;
      else if (scanned.safety_status === 'rejected') result.rejected += 1;
      else result.failed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
