import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadCaseEvidenceFile, claimPackSourcesFromCaseFile } from '@/lib/claims/caseEvidenceFile';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { buildClaimPack, hashClaimPackArtifact, renderClaimPackPdf, renderClaimPackZip } from '@/lib/recoveries/claimPack';
import { PERMISSIONS } from '@/lib/permissions';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';

const packSchema = z.object({
  finalize: z.boolean().default(false),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const parsed = packSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid claim-pack request.', issues: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const recoveryCase = await getRecoveryCase(auth.service, auth.ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found.' }, { status: 404 });
  const existingPack = await auth.service
    .from(TABLES.RECOVERY_CLAIM_PACKS)
    .select('*')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('recovery_case_id', recoveryCase.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existingPack.data) return NextResponse.json({ pack: existingPack.data, replayed: true }, { status: 200 });
  if (existingPack.error && !/does not exist|schema cache/i.test(existingPack.error.message)) {
    return NextResponse.json({ error: existingPack.error.message }, { status: 500 });
  }
  const file = await loadCaseEvidenceFile(auth.service, auth.ctx.merchantId, recoveryCase.support_payout_case_id);
  if (!file) return NextResponse.json({ error: 'Case evidence file not found.' }, { status: 404 });
  if (parsed.data.finalize && file.providerClaimReadiness.readiness !== 'ready_to_submit') {
    return NextResponse.json({
      error: 'Claim pack cannot be finalized until every hard gate is met.',
      readiness: file.providerClaimReadiness,
    }, { status: 422 });
  }
  const pack = buildClaimPack({
    recoveryCaseId: recoveryCase.id,
    supportPayoutCaseId: recoveryCase.support_payout_case_id,
    partnerName: recoveryCase.partner?.name ?? recoveryCase.owner_type,
    providerType: recoveryCase.owner_type,
    currency: recoveryCase.currency,
    amountSoughtMinor: recoveryCase.amount_sought_minor,
    readiness: file.providerClaimReadiness,
    ruleVersionId: file.partnerRule?.id ?? null,
    issueSummary: file.claim.issueSummary,
    chronology: file.custodyChain.map((event) => ({ stage: event.label, occurredAt: event.occurredAt, summary: event.summary, evidenceIds: event.evidenceIds })),
    sources: claimPackSourcesFromCaseFile(file),
    generatedAt: new Date().toISOString(),
    forceDraft: !parsed.data.finalize,
  });
  const pdf = await renderClaimPackPdf(pack);
  const zip = await renderClaimPackZip(pack, pdf);
  const safePrefix = `recovery-claim-packs/${auth.ctx.merchantId}/${recoveryCase.id}/${idempotencyKey}`;
  const pdfPath = `${safePrefix}/claim-pack.pdf`;
  const zipPath = `${safePrefix}/claim-pack.zip`;
  const [pdfUpload, zipUpload] = await Promise.all([
    auth.mutationClient.storage.from(STORAGE_BUCKETS.EVIDENCE_PACKAGES).upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: false }),
    auth.mutationClient.storage.from(STORAGE_BUCKETS.EVIDENCE_PACKAGES).upload(zipPath, zip, { contentType: 'application/zip', upsert: false }),
  ]);
  if (pdfUpload.error || zipUpload.error) {
    return NextResponse.json({ error: `Claim-pack artifact storage failed: ${pdfUpload.error?.message ?? zipUpload.error?.message}` }, { status: 500 });
  }
  const { data, error } = await (auth.mutationClient as any).rpc('record_recovery_claim_pack', {
    p_merchant_id: auth.ctx.merchantId,
    p_recovery_case_id: recoveryCase.id,
    p_support_payout_case_id: recoveryCase.support_payout_case_id,
    p_rule_version_id: file.partnerRule?.id ?? null,
    p_state: pack.state,
    p_posture: pack.manifest.posture,
    p_readiness: pack.manifest.readiness,
    p_readiness_snapshot: file.providerClaimReadiness,
    p_manifest: pack.manifest,
    p_pdf_storage_path: pdfPath,
    p_zip_storage_path: zipPath,
    p_pdf_hash: hashClaimPackArtifact(pdf),
    p_zip_hash: hashClaimPackArtifact(zip),
    p_generated_by: auth.user.id,
    p_idempotency_key: idempotencyKey,
    p_supersedes_pack_id: recoveryCase.current_claim_pack_id ?? null,
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 422 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  const recorded = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ pack: recorded, manifest: pack.manifest, pdfHash: hashClaimPackArtifact(pdf), zipHash: hashClaimPackArtifact(zip) }, { status: 201 });
}
