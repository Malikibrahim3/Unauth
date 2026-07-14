import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { upsertMerchantIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { SUPPORTED_DOCUMENT_TYPES } from '@/lib/integrations/providers/documentUpload';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import type { DocumentType } from '@/lib/integrations/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);
function magicMatches(bytes: Buffer, contentType: string): boolean {
  if (contentType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (contentType === 'text/plain') return !bytes.subarray(0, Math.min(bytes.length, 1024)).includes(0);
  return false;
}

function safeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'document';
}

export async function POST(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Multipart form data is required.' }, { status: 400 });

  const documentType = String(formData.get('document_type') ?? '').trim() as DocumentType;
  if (!SUPPORTED_DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Unsupported document type.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'A document file is required.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Document exceeds the 10 MB limit.' }, { status: 413 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Only PDF, DOCX, and plain-text documents are accepted.' }, { status: 415 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!magicMatches(bytes, file.type)) return NextResponse.json({ error: 'File contents do not match the declared document type.' }, { status: 415 });
  const filePath = `${ctx.merchantId}/${documentType}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await serviceClient.storage
    .from(STORAGE_BUCKETS.INTEGRATION_DOCUMENTS)
    .upload(filePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: 'Document upload failed.', code: 'document_upload_failed' }, { status: 500 });

  const { data: document, error: documentError } = await serviceClient
    .from(TABLES.INTEGRATION_DOCUMENTS)
    .insert({
      merchant_id: ctx.merchantId,
      document_type: documentType,
      file_path: filePath,
      extraction_status: 'quarantined',
      malware_scan_status: 'pending',
      content_type: file.type,
      size_bytes: file.size,
    })
    .select('id,document_type,file_path,extraction_status,approved_at,created_at')
    .single();
  if (documentError) return NextResponse.json({ error: 'Document registration failed.', code: 'document_registration_failed' }, { status: 500 });

  const provider = requireIntegrationProvider('document_upload');
  await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', { lastError: null });

  return NextResponse.json({
    ok: true,
    document,
    message: 'Document uploaded to quarantine. Extraction remains blocked until malware scanning completes.',
  });
}
