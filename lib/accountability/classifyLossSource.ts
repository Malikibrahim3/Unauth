import type { ClassifyLossSourceInput, LossSourceClassification, RecommendedRecoveryTask } from '@/lib/accountability/types';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function carrierTask(amount: number, deadline: string | null, carrier: string | null): RecommendedRecoveryTask {
  return {
    task_type: 'OPEN_CARRIER_CLAIM',
    owner_type: 'LOGISTICS',
    priority: 'HIGH',
    due_at: deadline ?? daysFromNow(2),
    recovery_deadline: deadline,
    amount_to_recover: amount,
    notes: carrier ? `Open carrier claim with ${carrier}.` : 'Open carrier claim.',
  };
}

function managerTask(amount: number, note: string): RecommendedRecoveryTask {
  return {
    task_type: 'ESCALATE_TO_MANAGER',
    owner_type: 'CX_MANAGER',
    priority: 'HIGH',
    due_at: daysFromNow(0),
    recovery_deadline: null,
    amount_to_recover: amount,
    notes: note,
  };
}

function taskDeadlineFromWindow(window: string): string | null {
  if (window === 'OPEN') return daysFromNow(7);
  if (window === 'CLOSING_SOON') return daysFromNow(2);
  return null;
}

export function classifyLossSource(input: ClassifyLossSourceInput): LossSourceClassification[] {
  const { claimType, evidence, gateDecision } = input;
  const summary = evidence.summary;
  const money = evidence.moneyAtRisk;
  const out: LossSourceClassification[] = [];

  if (
    claimType === 'DELIVERED_NOT_RECEIVED' &&
    summary.delivery_status === 'DELIVERED' &&
    summary.proof_of_delivery !== 'PRESENT' &&
    (summary.carrier_claim_window === 'OPEN' || summary.carrier_claim_window === 'CLOSING_SOON')
  ) {
    const deadline = taskDeadlineFromWindow(summary.carrier_claim_window);
    out.push({
      source_type: 'CARRIER_FAILURE',
      confidence: 'MEDIUM',
      accountable_party_type: 'CARRIER',
      accountable_party_name: summary.carrier,
      evidence_summary: 'Delivered scan exists, proof of delivery is missing or unknown, and the carrier claim window appears open.',
      money_at_risk: money,
      potential_recovery_amount: money,
      recommended_recovery_tasks: [carrierTask(money, deadline, summary.carrier)],
    });
  }

  if (
    claimType === 'DELIVERED_NOT_RECEIVED' &&
    summary.delivery_status === 'DELIVERED' &&
    summary.prior_dnr_claims_120d >= 2
  ) {
    out.push({
      source_type: 'CUSTOMER_CLAIM',
      confidence: 'MEDIUM',
      accountable_party_type: 'CUSTOMER',
      accountable_party_name: null,
      evidence_summary: `Customer has ${summary.prior_dnr_claims_120d} prior delivered-not-received claims in 120 days and this shipment has a delivered scan.`,
      money_at_risk: money,
      potential_recovery_amount: 0,
      recommended_recovery_tasks: [managerTask(money, 'Manager review required before refund or reship.')],
    });
  }

  if (claimType === 'WRONG_ITEM' || claimType === 'MISSING_ITEM') {
    out.push({
      source_type: 'WAREHOUSE_3PL_ERROR',
      confidence: 'MEDIUM',
      accountable_party_type: 'WAREHOUSE_3PL',
      accountable_party_name: null,
      evidence_summary: 'Claim type indicates a pick, pack, or item mismatch requiring warehouse/3PL review.',
      money_at_risk: money,
      potential_recovery_amount: money,
      recommended_recovery_tasks: [{
        task_type: 'CONTACT_3PL',
        owner_type: 'OPS_MANAGER',
        priority: 'HIGH',
        due_at: daysFromNow(2),
        recovery_deadline: null,
        amount_to_recover: money,
        notes: 'Ask warehouse or 3PL to verify pick/pack evidence.',
      }],
    });
  }

  if (summary.chargeback_risk === 'HIGH') {
    out.push({
      source_type: 'PAYMENT_DISPUTE_RISK',
      confidence: 'HIGH',
      accountable_party_type: 'PAYMENT_PROVIDER',
      accountable_party_name: null,
      evidence_summary: 'Customer message references a bank dispute, chargeback, or payment dispute.',
      money_at_risk: money,
      potential_recovery_amount: 0,
      recommended_recovery_tasks: [{
        task_type: 'PREPARE_CHARGEBACK_EVIDENCE',
        owner_type: 'FINANCE',
        priority: 'URGENT',
        due_at: daysFromNow(1),
        recovery_deadline: null,
        amount_to_recover: money,
        notes: 'Preserve order, delivery, and correspondence evidence for dispute response.',
      }],
    });
  }

  if (gateDecision.gateStatus === 'HOLD_FOR_REVIEW' || gateDecision.gateStatus === 'ESCALATE') {
    // Keep this as a task signal, not a fault verdict.
    if (!out.some((item) => item.recommended_recovery_tasks.some((task) => task.task_type === 'ESCALATE_TO_MANAGER'))) {
      out.push({
        source_type: 'UNKNOWN',
        confidence: 'LOW',
        accountable_party_type: 'UNKNOWN',
        accountable_party_name: null,
        evidence_summary: 'A merchant review rule held the case, but evidence does not identify a more specific source yet.',
        money_at_risk: money,
        potential_recovery_amount: 0,
        recommended_recovery_tasks: [managerTask(money, 'Review likely source and decide whether recovery is viable.')],
      });
    }
  }

  if (out.length === 0) {
    out.push({
      source_type: 'UNKNOWN',
      confidence: 'LOW',
      accountable_party_type: 'UNKNOWN',
      accountable_party_name: null,
      evidence_summary: 'No confident source classification is available from current evidence.',
      money_at_risk: money,
      potential_recovery_amount: 0,
      recommended_recovery_tasks: [managerTask(money, 'Review source of loss and decide next action.')],
    });
  }

  return out;
}

