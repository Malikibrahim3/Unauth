import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES, STORAGE_BUCKETS } from '@/lib/supabase/tables';
import { createScopedClient } from '@/lib/supabase/scoped';
import { normaliseEmail } from '@/lib/identity/normalise';
import { hashIdentifier } from '@/lib/identity/hash';
import { buildEvidencePackage } from '@/lib/evidence/buildPackage';
import { buildNarrative } from '@/lib/evidence/narrative';
import { renderEvidencePDF } from '@/lib/evidence/pdf';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { logPublicApiAccess } from '@/lib/api/v1/audit';
import { env } from '@/lib/utils/env';
import { makeSignedToken, hashSignedToken } from '@/lib/api/signedAccess';

export type EvidenceAuth = {
  merchantId: string;
  apiKeyId: string;
  requestIp: string;
};

export type EvidenceBody = {
  email: string;
  orderId: string;
  disputedAmount?: number;
  currency?: string;
};

export type EvidenceResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string; detail?: string };

async function issueEvidenceDownloadUrl(
  service: SupabaseClient,
  merchantId: string,
  evidenceId: string
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const token = makeSignedToken({
    evidence_id: evidenceId,
    merchant_id: merchantId,
    expires_at: expiresAt,
  });

  const { error } = await service.from(TABLES.EVIDENCE_DOWNLOAD_TOKENS).insert({
    evidence_id: evidenceId,
    merchant_id: merchantId,
    token_hash: hashSignedToken(token),
    expires_at: expiresAt,
  });
  if (error) return null;

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return `${appBase}/api/v1/evidence/${evidenceId}/download?token=${encodeURIComponent(token)}`;
}

async function resolveProfileIdByEmail(
  service: SupabaseClient,
  merchantId: string,
  normEmail: string
): Promise<string | null> {
  const { data } = await service
    .from(TABLES.SOURCE_CUSTOMERS)
    .select('id')
    .eq('merchant_id', merchantId)
    .ilike('email', normEmail)
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };
  return data?.id ?? null;
}

async function resolveDisputedTransactionId(
  service: SupabaseClient,
  merchantId: string,
  profileId: string,
  orderRef: string
): Promise<string | null> {
  const base = () => service
    .from(TABLES.SOURCE_ORDERS)
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('source_customer_id', profileId);

  const { data: byUuid } = await base()
    .eq('id', orderRef)
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };
  if (byUuid?.id) return byUuid.id;

  const { data: byExternalId } = await base()
    .eq('external_id', orderRef)
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };
  if (byExternalId?.id) return byExternalId.id;

  const { data: byOrderNumber } = await base()
    .eq('order_number', orderRef)
    .limit(1)
    .maybeSingle() as unknown as { data: { id: string } | null };
  return byOrderNumber?.id ?? null;
}

export async function performV1EvidenceCreate(
  service: SupabaseClient,
  auth: EvidenceAuth,
  body: EvidenceBody
): Promise<EvidenceResult> {
  const email = body.email?.trim();
  const orderId = body.orderId?.trim();

  if (!email || !orderId) {
    return { ok: false, status: 400, error: 'email and order_id are required' };
  }

  const limited = await enforceRateLimit(
    rateLimitKey('evidence', 'generate', auth.merchantId),
    limitFromEnv('RL_EVIDENCE_PER_HOUR', 60, 3600, 'RL_EVIDENCE_WINDOW_SECONDS')
  );
  if (limited) {
    return { ok: false, status: 429, error: 'Evidence generation rate limit exceeded' };
  }

  const normEmail = normaliseEmail(email);
  if (!normEmail) {
    return { ok: false, status: 400, error: 'Invalid email address' };
  }
  const queriedHashes = [hashIdentifier(normEmail)];

  const profileId = await resolveProfileIdByEmail(service, auth.merchantId, normEmail);
  if (!profileId) {
    await logPublicApiAccess(service, {
      merchantId: auth.merchantId,
      queryType: 'api_v1_evidence',
      kAnonymitySatisfied: false,
      resultReturned: false,
      queriedHashes,
      matchedMerchantCount: 0,
      requestIp: auth.requestIp,
      apiKeyId: auth.apiKeyId,
    });
    return { ok: false, status: 404, error: 'Customer not found in your merchant data' };
  }

  const disputedOrderId = await resolveDisputedTransactionId(
    service,
    auth.merchantId,
    profileId,
    orderId
  );

  if (!disputedOrderId) {
    return { ok: false, status: 404, error: 'Order not found for this merchant' };
  }

  let pkg;
  try {
    pkg = await buildEvidencePackage(
      auth.merchantId,
      profileId,
      disputedOrderId,
      service,
      null
    );
    if (body.disputedAmount != null || body.currency) {
      const amountLine = [
        body.disputedAmount != null ? `Disputed amount: ${body.disputedAmount}` : null,
        body.currency ? `Currency: ${body.currency}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      pkg.merchantNotes = pkg.merchantNotes
        ? `${amountLine}\n\n${pkg.merchantNotes}`
        : amountLine;
    }
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: 'Failed to build evidence package',
      detail: String(err),
    };
  }

  const narrative = buildNarrative(pkg);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderEvidencePDF(pkg, narrative);
  } catch (err) {
    return { ok: false, status: 500, error: 'Failed to render PDF', detail: String(err) };
  }

  const storagePath = `api-keys/${auth.merchantId}/${pkg.referenceNumber}.pdf`;
  const { error: uploadError } = await service.storage
    .from(STORAGE_BUCKETS.EVIDENCE_PACKAGES)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  const scoped = createScopedClient(auth.merchantId, service);

  const { data: inserted, error: insertError } = await scoped
    .from(TABLES.EVIDENCE_PACKAGES)
    .insert({
      customer_profile_id: profileId,
      generated_for_order_id: disputedOrderId,
      reference_number: pkg.referenceNumber,
      pdf_storage_path: uploadError ? null : storagePath,
      narrative_summary: narrative,
      signal_snapshot: pkg.identityEvidence as never,
      cross_merchant_indicator: pkg.crossMerchant.satisfied,
      ce3_eligible: pkg.ce3.eligible,
      ce3_qualifying_signals: pkg.ce3.qualifyingSignals as never,
      ce3_prior_transactions: pkg.ce3.priorTransactions as never,
      merchant_notes: pkg.merchantNotes ?? null,
    })
    .select('id, created_at')
    .single();

  if (insertError || !inserted) {
    return { ok: false, status: 500, error: 'Failed to save evidence package' };
  }

  const row = inserted as { id: string; created_at: string };

  await logPublicApiAccess(service, {
    merchantId: auth.merchantId,
    queryType: 'api_v1_evidence',
    kAnonymitySatisfied: pkg.crossMerchant.satisfied,
    resultReturned: true,
    queriedHashes,
    matchedMerchantCount: pkg.crossMerchant.satisfied ? 3 : 0,
    requestIp: auth.requestIp,
    apiKeyId: auth.apiKeyId,
  });

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const downloadUrl = await issueEvidenceDownloadUrl(service, auth.merchantId, row.id);

  return {
    ok: true,
    body: {
      evidence_id: row.id,
      reference: pkg.referenceNumber,
      has_prior_match_evidence: pkg.ce3.eligible,
      matched_prior_signals: pkg.ce3.qualifyingSignals,
      pdf_url: `${appBase}/api/v1/evidence/${row.id}/pdf`,
      download_url: downloadUrl,
      created_at: row.created_at ?? new Date().toISOString(),
    },
  };
}

export async function streamV1EvidencePdf(
  service: SupabaseClient,
  merchantId: string,
  evidenceId: string
): Promise<
  | { ok: true; buffer: ArrayBuffer; filename: string }
  | { ok: false; status: number; error: string }
> {
  const scoped = createScopedClient(merchantId, service);

  const { data: packageRow, error: pkgError } = await scoped
    .from(TABLES.EVIDENCE_PACKAGES)
    .select('id, pdf_storage_path, reference_number')
    .eq('id', evidenceId)
    .single() as unknown as {
    data: { id: string; pdf_storage_path: string | null; reference_number: string } | null;
    error: unknown;
  };

  if (pkgError || !packageRow) {
    return { ok: false, status: 404, error: 'Package not found' };
  }

  if (!packageRow.pdf_storage_path) {
    return { ok: false, status: 404, error: 'PDF not available' };
  }

  const { data: fileData, error: dlError } = await service.storage
    .from(STORAGE_BUCKETS.EVIDENCE_PACKAGES)
    .download(packageRow.pdf_storage_path);

  if (dlError || !fileData) {
    return { ok: false, status: 404, error: 'PDF not found in storage' };
  }

  const arrayBuffer = await fileData.arrayBuffer();
  return {
    ok: true,
    buffer: arrayBuffer,
    filename: `${packageRow.reference_number}.pdf`,
  };
}
