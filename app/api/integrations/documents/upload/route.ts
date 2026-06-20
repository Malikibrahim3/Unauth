import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { upsertMerchantIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { SUPPORTED_DOCUMENT_TYPES } from '@/lib/integrations/providers/documentUpload';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import type { DocumentType } from '@/lib/integrations/types';

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

  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = `${ctx.merchantId}/${documentType}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await serviceClient.storage
    .from(STORAGE_BUCKETS.INTEGRATION_DOCUMENTS)
    .upload(filePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: document, error: documentError } = await serviceClient
    .from(TABLES.INTEGRATION_DOCUMENTS)
    .insert({
      merchant_id: ctx.merchantId,
      document_type: documentType,
      file_path: filePath,
      extraction_status: 'uploaded',
    })
    .select('id,document_type,file_path,extraction_status,approved_at,created_at')
    .single();
  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 500 });

  const provider = requireIntegrationProvider('document_upload');
  await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', { lastError: null });

  return NextResponse.json({
    ok: true,
    document,
    message: 'Document uploaded. Extracted terms must be approved before rules use them.',
  });
}
