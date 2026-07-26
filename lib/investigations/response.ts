import type { SupabaseClient } from '@supabase/supabase-js';
import { upsertClaimEvidence } from '@/lib/integrations/canonicalEvidence';
import { stableEvidenceId } from '@/lib/integrations/stableEvidenceId';
import type { CaseInvestigation } from '@/lib/investigations/types';

export async function projectInvestigationResponseEvidence(
  client: SupabaseClient,
  investigation: CaseInvestigation,
  actorUserId: string,
): Promise<Record<string, unknown> | null> {
  if (
    investigation.status !== 'response_received'
    || !investigation.response_outcome
    || !investigation.response_summary
  ) {
    return null;
  }

  const evidenceId = stableEvidenceId(
    investigation.merchant_id,
    'investigation',
    'investigation_response',
    investigation.id,
  );
  return upsertClaimEvidence(client, {
    id: evidenceId,
    merchantId: investigation.merchant_id,
    claimId: investigation.support_payout_case_id,
    evidenceType: 'investigation_response',
    title: `Response from ${investigation.target_name ?? investigation.target_type}`,
    summary: investigation.response_summary,
    sourceSystem: 'investigation',
    sourceRecordId: investigation.id,
    sourceCreatedAt: investigation.response_received_at,
    structuredValue: {
      response_outcome: investigation.response_outcome,
      response_body: investigation.response_body,
      responder_name: investigation.responder_name,
    },
    sourceMetadata: {
      source: 'investigation',
      migration_key: `investigation_response:${investigation.id}`,
      investigation_id: investigation.id,
      target_type: investigation.target_type,
      partner_id: investigation.partner_id,
      response_outcome: investigation.response_outcome,
      external_reference: investigation.external_reference,
      external_url: investigation.external_url,
      responder_name: investigation.responder_name,
      response_received_at: investigation.response_received_at,
      collected_at: new Date().toISOString(),
    },
    createdBy: actorUserId,
  });
}

