import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { data: document, error: lookupError } = await serviceClient
    .from('integration_documents')
    .select('id,merchant_id,extraction_status,malware_scan_status')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Document lookup failed.', code: 'document_lookup_failed' }, { status: 500 });
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (document.malware_scan_status !== 'clean' || document.extraction_status === 'quarantined') {
    return NextResponse.json({ error: 'Document extraction is blocked until malware scanning reports clean.' }, { status: 409 });
  }

  const { data, error } = await serviceClient
    .from('integration_documents')
    .update({ extraction_status: 'needs_merchant_approval' })
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .select('id,document_type,file_path,extraction_status,approved_at')
    .single();
  if (error) return NextResponse.json({ error: 'Document extraction request failed.', code: 'document_extraction_request_failed' }, { status: 500 });

  return NextResponse.json({
    document: data,
    message: 'Document marked for merchant review. Terms are not used until approved.',
  });
}
