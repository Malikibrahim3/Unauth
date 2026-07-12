import { buildAgreementProvenance } from '@/lib/agreements/provenance';
import type { ExtractedAgreementClause } from '@/lib/agreements/extractClauses';

export type GeneratedAgreementRule = {
  rule_code: string;
  rule_name: string;
  rule_type:
    | 'RECOVERY_ELIGIBILITY'
    | 'RECOVERY_NOT_WORTH_CHASING'
    | 'EVIDENCE_REQUIREMENT'
    | 'DEADLINE'
    | 'LIABILITY_CAP'
    | 'INTERNAL_POLICY';
  applies_to_claim_type: string;
  conditions: Record<string, unknown>;
  result: Record<string, unknown>;
  priority: number;
  status: 'draft';
};

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'rule';
}

export function generateAgreementRules(input: {
  agreementId: string;
  clauses: Array<ExtractedAgreementClause & { id?: string | null }>;
  counterpartyName?: string | null;
}): GeneratedAgreementRule[] {
  return input.clauses.map((clause, index) => {
    const baseCode = `${slug(clause.clause_type)}_${index + 1}`;
    const provenance = buildAgreementProvenance({
      agreement_id: input.agreementId,
      clause_id: clause.id ?? null,
      source_location: clause.source_location,
      excerpt: clause.clause_text,
    });

    if (clause.clause_type === 'CLAIM_WINDOW') {
      return {
        rule_code: baseCode,
        rule_name: 'Claim window requirement',
        rule_type: 'DEADLINE',
        applies_to_claim_type: 'ANY',
        conditions: { all: [{ field: 'loss_source.accountable_party_type', op: 'eq', value: 'CARRIER' }] },
        result: {
          recovery_eligible: true,
          deadline_days: clause.extracted_value.deadline_days ?? null,
          recovery_route: 'CARRIER_CLAIM',
          reason: 'Carrier agreement appears to define a claim submission window.',
          provenance,
        },
        priority: 50,
        status: 'draft',
      };
    }

    if (clause.clause_type === 'EVIDENCE_REQUIRED') {
      return {
        rule_code: baseCode,
        rule_name: 'Evidence requirement',
        rule_type: 'EVIDENCE_REQUIREMENT',
        applies_to_claim_type: 'ANY',
        conditions: { all: [{ field: 'loss_source.accountable_party_type', op: 'eq', value: 'CARRIER' }] },
        result: {
          recovery_eligible: 'pending_evidence',
          required_evidence: clause.extracted_value.required_evidence ?? [],
          missing_evidence: clause.extracted_value.required_evidence ?? [],
          task_type: 'REQUEST_CARRIER_EVIDENCE',
          recovery_route: 'CARRIER_CLAIM',
          reason: 'Carrier agreement appears to require supporting evidence before recovery.',
          provenance,
        },
        priority: 40,
        status: 'draft',
      };
    }

    if (clause.clause_type === 'DELIVERED_NOT_RECEIVED_RULE') {
      return {
        rule_code: baseCode,
        rule_name: 'Delivered not received recovery rule',
        rule_type: 'RECOVERY_ELIGIBILITY',
        applies_to_claim_type: 'DELIVERED_NOT_RECEIVED',
        conditions: { all: [{ field: 'summary.delivery_status', op: 'eq', value: 'DELIVERED' }] },
        result: {
          recovery_eligible: true,
          recovery_route: 'CARRIER_CLAIM',
          reason: 'Agreement clause references delivered-not-received handling.',
          provenance,
        },
        priority: 30,
        status: 'draft',
      };
    }

    return {
      rule_code: baseCode,
      rule_name: `${clause.clause_type.replace(/_/g, ' ')} clause`,
      rule_type: clause.clause_type === 'LIABILITY_CAP' ? 'LIABILITY_CAP' : 'INTERNAL_POLICY',
      applies_to_claim_type: 'ANY',
      conditions: { any: [{ field: 'claim_type', op: 'missing', value: true }] },
      result: {
        recovery_eligible: 'unknown',
        reason: 'Clause requires manual review before it can affect claim recovery.',
        provenance,
      },
      priority: 100,
      status: 'draft',
    };
  });
}
