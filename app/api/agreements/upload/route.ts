import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';

const agreementTypeSchema = z.enum([
  'COURIER',
  'WAREHOUSE_3PL',
  'PAYMENT_PROVIDER',
  'INSURANCE',
  'RETURNS_PLATFORM',
  'MARKETPLACE',
  'INTERNAL_POLICY',
  'OTHER',
]);

function safeFileName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'agreement';
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
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

  const typeResult = agreementTypeSchema.safeParse(String(formData.get('agreement_type') ?? '').trim());
  if (!typeResult.success) return NextResponse.json({ error: 'Unsupported agreement type.' }, { status: 400 });

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'An agreement file is required.' }, { status: 400 });
  }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Agreements must be uploaded as PDF files.' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Agreement PDFs must be 10 MB or smaller.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = `${ctx.merchantId}/agreements/${typeResult.data}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await serviceClient.storage
    .from(STORAGE_BUCKETS.INTEGRATION_DOCUMENTS)
    .upload(filePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: agreement, error: agreementError } = await serviceClient
    .from(TABLES.AGREEMENTS)
    .insert({
      merchant_id: ctx.merchantId,
      agreement_type: typeResult.data,
      counterparty_name: optionalText(formData, 'counterparty_name'),
      service_name: optionalText(formData, 'service_name'),
      document_name: optionalText(formData, 'document_name') ?? file.name,
      document_url: filePath,
      file_mime_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
      status: 'needs_review',
      effective_from: optionalText(formData, 'effective_from'),
      effective_to: optionalText(formData, 'effective_to'),
      version_label: optionalText(formData, 'version_label'),
      uploaded_by: user.email ?? user.id,
    })
    .select('id,agreement_type,counterparty_name,service_name,document_name,status,created_at')
    .single();
  if (agreementError) return NextResponse.json({ error: agreementError.message }, { status: 500 });

  const { data: job, error: jobError } = await serviceClient
    .from(TABLES.DOCUMENT_UPLOAD_JOBS)
    .insert({
      merchant_id: ctx.merchantId,
      agreement_id: agreement.id,
      status: 'needs_review',
    })
    .select('id,status,created_at')
    .single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    agreement,
    upload_status: 'needs_review',
    document_upload_job: job,
    message: 'Agreement uploaded. Enter and approve its terms before they can affect claims.',
  });
}
