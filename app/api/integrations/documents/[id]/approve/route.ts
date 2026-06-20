import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';

const approveSchema = z.object({
  partner_type: z.enum(['carrier', 'three_pl', 'supplier', 'insurer']).default('carrier'),
  covered_loss_types: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  claim_deadline_days: z.number().int().nonnegative().nullable().optional(),
  required_evidence: z.array(z.string()).default([]),
  max_recoverable_amount: z.number().nonnegative().nullable().optional(),
  deductible_amount: z.number().nonnegative().nullable().optional(),
  claim_submission_method: z.string().trim().max(500).nullable().optional(),
  escalation_contact: z.string().trim().max(500).nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Valid merchant-approved terms are required.' }, { status: 400 });

  const { data: document, error: lookupError } = await serviceClient
    .from('integration_documents')
    .select('id')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  const now = new Date().toISOString();
  const { data: terms, error: termsError } = await serviceClient
    .from('extracted_partner_terms')
    .upsert({
      merchant_id: ctx.merchantId,
      document_id: id,
      ...parsed.data,
      approved_at: now,
      approved_by: user.id,
    }, { onConflict: 'merchant_id,document_id' })
    .select('*')
    .single();
  if (termsError) return NextResponse.json({ error: termsError.message }, { status: 500 });

  const { error: docError } = await serviceClient
    .from('integration_documents')
    .update({ extraction_status: 'approved', approved_at: now, approved_by: user.id })
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId);
  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  return NextResponse.json({ terms });
}
