import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import type { ClaimGateCase, ClaimGateDecision, ClaimGateEvidence } from '@/lib/claim-gate/types';
import type { AccountabilityResult } from '@/lib/accountability/types';

function tagForStatus(status: string): string {
  switch (status) {
    case 'HOLD_FOR_REVIEW':
      return 'unauth_hold';
    case 'ESCALATE':
      return 'unauth_escalate';
    case 'NEED_MORE_EVIDENCE':
      return 'unauth_need_evidence';
    case 'PROCEED':
      return 'unauth_proceed';
    default:
      return 'unauth_manual_review';
  }
}

function accountabilityTags(accountability: AccountabilityResult | undefined): string[] {
  if (!accountability) return [];
  const tags = new Set<string>();
  if (accountability.lossSources.some((source) => source.source_type === 'CARRIER_FAILURE')) {
    tags.add('unauth_source_carrier');
  }
  if (accountability.recoveryTasks.some((task) => ['open', 'eligible_to_chase', 'in_progress'].includes(task.status))) {
    tags.add('unauth_recovery_open');
  }
  if (
    accountability.recoveryTasks.some((task) => task.owner_type === 'CX_MANAGER' || task.task_type === 'ESCALATE_TO_MANAGER') ||
    accountability.lossSources.some((source) => source.source_type === 'UNKNOWN')
  ) {
    tags.add('unauth_manager_review');
  }
  return Array.from(tags);
}

function accountabilitySection(accountability: AccountabilityResult | undefined): string[] {
  if (!accountability) return [];
  const sourceLines = accountability.lossSources.map((source) => {
    const party = source.accountable_party_name
      ? `${source.accountable_party_type} (${source.accountable_party_name})`
      : source.accountable_party_type;
    return `- ${source.source_type} (${source.confidence}) -> ${party}; status ${source.status}; recoverable ${source.potential_recovery_amount}`;
  });
  const taskLines = accountability.recoveryTasks.map((task) => {
    const deadline = task.recovery_deadline ? `; deadline ${task.recovery_deadline}` : '';
    return `- ${task.task_type} -> ${task.owner_type}; status ${task.status}; target ${task.amount_to_recover}${deadline}`;
  });
  const agreement = accountability.agreementEvaluation
    ? [
        'Agreement check:',
        `- Eligible: ${accountability.agreementEvaluation.recovery_eligible}`,
        `- Route: ${accountability.agreementEvaluation.recovery_route}`,
        `- Reason: ${accountability.agreementEvaluation.reason}`,
        accountability.agreementEvaluation.warning ? `- Warning: ${accountability.agreementEvaluation.warning}` : null,
      ].filter((line): line is string => Boolean(line))
    : ['Agreement check:', '- No active agreement evaluation recorded.'];

  return [
    'Loss source:',
    sourceLines.join('\n') || '- None classified',
    'Recovery tasks:',
    taskLines.join('\n') || '- None',
    ...agreement,
  ];
}

function buildInternalNote(
  claim: ClaimGateCase,
  decision: ClaimGateDecision,
  evidence: ClaimGateEvidence,
  accountability?: AccountabilityResult,
): string {
  const rules = decision.triggeredRules
    .map((rule) => `- ${rule.rule_id ?? 'Rule'}: ${rule.reason}`)
    .join('\n');

  return [
    `UNAUTH CLAIM GATE: ${decision.gateStatus}`,
    `Claim type: ${claim.claim_type}`,
    `Money at risk: ${evidence.moneyAtRisk} ${evidence.currency}`,
    'Triggered rules:',
    rules || '- None',
    'Evidence:',
    `- Order value: ${evidence.summary.order_value}`,
    `- Delivery status: ${evidence.summary.delivery_status}`,
    `- Proof of delivery: ${evidence.summary.proof_of_delivery}`,
    `- Prior DNR claims in 120d: ${evidence.summary.prior_dnr_claims_120d}`,
    `- Prior refunds in 120d: ${evidence.summary.prior_refunds_120d}`,
    `- Carrier claim window: ${evidence.summary.carrier_claim_window}`,
    `- Chargeback risk: ${evidence.summary.chargeback_risk}`,
    'Merchant policy next step:',
    decision.policyNextStep,
    ...accountabilitySection(accountability),
    'Case file:',
    claim.case_url,
    'Blocked actions:',
    decision.blockedActions.join(', ') || 'None',
  ].join('\n');
}

export async function writeGateResultToGorgias(input: {
  client: unknown;
  merchantId: string;
  externalTicketId: string;
  claim: ClaimGateCase;
  decision: ClaimGateDecision;
  evidence: ClaimGateEvidence;
  accountability?: AccountabilityResult;
  /**
   * Plain-English recommendation block from the decision engine. When present
   * it leads the internal note, ahead of the detailed evidence dump.
   */
  recommendationNote?: string;
}): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  const access = await getActiveGorgiasMerchantApiAccess(input.client, input.merchantId);
  if (!access) return { attempted: false, ok: false, error: 'gorgias_not_connected' };

  try {
    const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.externalTicketId)}/tags`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          names: [
            'unauth_checked',
            tagForStatus(input.decision.gateStatus),
            ...accountabilityTags(input.accountability),
          ],
        }),
      },
    );
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.externalTicketId)}/messages`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          channel: 'internal-note',
          source: { type: 'api' },
          body_text: input.recommendationNote
            ? `${input.recommendationNote}\n\n— Detail —\n${buildInternalNote(input.claim, input.decision, input.evidence, input.accountability)}`
            : buildInternalNote(input.claim, input.decision, input.evidence, input.accountability),
          from_agent: true,
        }),
      },
    );
    return { attempted: true, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('claim_gate_gorgias_writeback_failed', {
      merchantId: input.merchantId,
      externalTicketId: input.externalTicketId,
      message,
    });
    return { attempted: true, ok: false, error: message };
  }
}

export async function writeAccountabilityNoteToGorgias(input: {
  client: unknown;
  merchantId: string;
  externalTicketId: string | null | undefined;
  bodyText: string;
  tags?: string[];
}): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  if (!input.externalTicketId) return { attempted: false, ok: false, error: 'missing_external_ticket_id' };
  const access = await getActiveGorgiasMerchantApiAccess(input.client, input.merchantId);
  if (!access) return { attempted: false, ok: false, error: 'gorgias_not_connected' };

  try {
    const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
    if (input.tags?.length) {
      await gorgiasApiRequest<unknown>(
        apiBase,
        `/tickets/${encodeURIComponent(input.externalTicketId)}/tags`,
        access.credentials,
        {
          method: 'POST',
          body: JSON.stringify({ names: input.tags }),
        },
      );
    }
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.externalTicketId)}/messages`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          channel: 'internal-note',
          source: { type: 'api' },
          body_text: input.bodyText,
          from_agent: true,
        }),
      },
    );
    return { attempted: true, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('accountability_gorgias_note_failed', {
      merchantId: input.merchantId,
      externalTicketId: input.externalTicketId,
      message,
    });
    return { attempted: true, ok: false, error: message };
  }
}
