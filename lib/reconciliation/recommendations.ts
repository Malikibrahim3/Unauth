import { createHash } from 'node:crypto';
import type {
  ItemParcelRow,
  ReconciliationFact,
  ReconciliationInput,
  ReconciliationParcel,
  ReconciliationRecommendation,
} from './types';

export const RECONCILIATION_ENGINE_VERSION = 'reconciliation-v1';

function nowFor(input: ReconciliationInput): string {
  return input.now ?? new Date().toISOString();
}

function normalise(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function stableValue(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}

export function reconciliationInputHash(input: ReconciliationInput): string {
  return createHash('sha256').update(stableValue(input), 'utf8').digest('hex');
}

function factIds(facts: ReconciliationFact[], predicate: (fact: ReconciliationFact) => boolean): string[] {
  return facts.filter(predicate).map((fact) => fact.id);
}

function dateIsPast(value: string | null | undefined, now: string): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  const current = Date.parse(now);
  return Number.isFinite(parsed) && Number.isFinite(current) && parsed < current;
}

function parcelDelivered(parcel: ReconciliationParcel): boolean {
  const status = normalise(parcel.status);
  return Boolean(parcel.deliveredAt)
    || status === 'delivered'
    || status === 'completed'
    || status === 'delivered_to_recipient';
}

function parcelInTransit(parcel: ReconciliationParcel): boolean {
  const status = normalise(parcel.status);
  return !parcelDelivered(parcel)
    && !parcel.exception
    && ['in_transit', 'in transit', 'pending', 'label_created', 'shipped', 'accepted'].includes(status);
}

function parcelHasPhysicalProof(parcel: ReconciliationParcel, facts: ReconciliationFact[]): boolean {
  const parcelFacts = facts.filter((fact) => fact.sourceShipmentId === parcel.id);
  return parcelFacts.some((fact) =>
    fact.factKind !== 'inference'
    && ['pick_scan', 'pack_scan', 'parcel_weight', 'pack_photo', 'pack_video', 'delivery_photo', 'signature', 'gps'].includes(normalise(fact.evidenceType)),
  );
}

function parcelEvidenceIds(parcel: ReconciliationParcel, facts: ReconciliationFact[]): string[] {
  return facts.filter((fact) => fact.sourceShipmentId === parcel.id).map((fact) => fact.id);
}

/**
 * Reconciles claimed quantities against provider-recorded shipment lines. A
 * provider line is never promoted to physical pack proof by this function.
 */
export function buildItemParcelMatrix(input: ReconciliationInput): ItemParcelRow[] {
  const rows: ItemParcelRow[] = [];
  for (const item of input.claimedItems) {
    const candidates = input.parcels.filter((parcel) => parcel.shipmentLines.some((line) => {
      if (item.sourceOrderLineId && line.sourceOrderLineId) {
        return item.sourceOrderLineId === line.sourceOrderLineId;
      }
      return Boolean(item.sku && line.sku && normalise(item.sku) === normalise(line.sku));
    }));

    if (candidates.length === 0) {
      rows.push({
        claimedItemId: item.id,
        parcelId: null,
        claimedSku: item.sku ?? null,
        claimedQuantity: item.quantity,
        recordedQuantity: 0,
        remainingQuantity: item.quantity,
        state: 'not_recorded',
        physicalProof: false,
        evidenceIds: [],
        missingEvidence: ['fulfilment or shipment record', 'pick/pack evidence'],
      });
      continue;
    }

    let remaining = item.quantity;
    for (const parcel of candidates) {
      if (remaining <= 0) break;
      const lines = parcel.shipmentLines.filter((line) => {
        if (item.sourceOrderLineId && line.sourceOrderLineId) {
          return item.sourceOrderLineId === line.sourceOrderLineId;
        }
        return Boolean(item.sku && line.sku && normalise(item.sku) === normalise(line.sku));
      });
      const recordedQuantity = Math.min(
        remaining,
        lines.reduce((total, line) => total + Math.max(0, line.quantityRecorded), 0),
      );
      if (recordedQuantity <= 0) continue;
      remaining -= recordedQuantity;
      const physicalProof = parcelHasPhysicalProof(parcel, input.facts);
      const state: ItemParcelRow['state'] = parcel.exception
        ? 'exception'
        : parcelDelivered(parcel)
          ? 'delivered'
          : parcelInTransit(parcel)
            ? 'in_transit'
            : 'unresolved';
      rows.push({
        claimedItemId: item.id,
        parcelId: parcel.id,
        claimedSku: item.sku ?? null,
        claimedQuantity: item.quantity,
        recordedQuantity,
        remainingQuantity: 0,
        state,
        physicalProof,
        evidenceIds: parcelEvidenceIds(parcel, input.facts),
        missingEvidence: physicalProof ? [] : ['pick/pack evidence', 'parcel weight or pack record'],
      });
    }
    if (remaining > 0) {
      rows.push({
        claimedItemId: item.id,
        parcelId: null,
        claimedSku: item.sku ?? null,
        claimedQuantity: item.quantity,
        recordedQuantity: 0,
        remainingQuantity: remaining,
        state: 'not_recorded',
        physicalProof: false,
        evidenceIds: [],
        missingEvidence: ['fulfilment or shipment record', 'pick/pack evidence'],
      });
    }
  }
  return rows;
}

function baseRecommendation(
  input: ReconciliationInput,
  recommendationType: ReconciliationRecommendation['recommendationType'],
  values: Omit<ReconciliationRecommendation, 'recommendationType' | 'generatedAt' | 'engineVersion'>,
): ReconciliationRecommendation {
  return {
    recommendationType,
    ...values,
    generatedAt: nowFor(input),
    engineVersion: RECONCILIATION_ENGINE_VERSION,
  };
}

function hasCustomerEvidence(input: ReconciliationInput): string[] {
  return factIds(input.facts, (fact) =>
    ['customer_statement', 'customer_message', 'customer_attachment', 'support_ticket'].includes(normalise(fact.evidenceType)),
  );
}

function hasCarrierException(input: ReconciliationInput): string[] {
  return factIds(input.facts, (fact) =>
    ['carrier_exception', 'carrier_loss', 'carrier_damage'].includes(normalise(fact.evidenceType)),
  );
}

function hasInconsistentPod(input: ReconciliationInput): string[] {
  return factIds(input.facts, (fact) =>
    normalise(fact.evidenceType) === 'human_finding'
      && normalise(fact.value?.finding as string | undefined) === 'inconsistent',
  );
}

function claimIsMissingItem(input: ReconciliationInput): boolean {
  return ['missing_item', 'wrong_item', 'item_not_received'].includes(normalise(input.claimType));
}

export function recommendCustomerAction(
  input: ReconciliationInput,
  matrix: ItemParcelRow[] = buildItemParcelMatrix(input),
): ReconciliationRecommendation {
  if (input.identityConfirmed === false || input.orderConfirmed === false) {
    return baseRecommendation(input, 'customer_action', {
      resultCode: 'manual_review',
      assessmentState: 'blocked',
      headline: 'Confirm the order and claimed item before acting.',
      explanation: 'The current identifiers produce an ambiguous match, so a customer action would risk acting on the wrong order.',
      reasonCodes: ['identity_match_required'],
      supportingEvidenceIds: [],
      conflictingEvidenceIds: [],
      missingEvidence: ['confirmed order and claimed item match'],
      policyVersionId: input.policy?.ruleVersionId ?? null,
      policySnapshot: input.policy?.snapshot ?? null,
    });
  }

  const now = nowFor(input);
  const inWindow = matrix.filter((row) => {
    const parcel = input.parcels.find((candidate) => candidate.id === row.parcelId);
    return row.state === 'in_transit' && parcel && !dateIsPast(parcel.estimatedDeliveryAt, now);
  });
  if (inWindow.length > 0) {
    const supporting = inWindow.flatMap((row) => row.evidenceIds);
    return baseRecommendation(input, 'customer_action', {
      resultCode: 'wait_and_explain',
      assessmentState: 'known',
      headline: 'Wait and explain the active shipment.',
      explanation: 'The claimed item is recorded in a parcel that is still within its delivery window; provide tracking and recheck after the promised date.',
      reasonCodes: ['item_in_active_parcel', 'delivery_window_open'],
      supportingEvidenceIds: supporting,
      conflictingEvidenceIds: [],
      missingEvidence: [],
      recheckAt: input.parcels.find((parcel) => inWindow.some((row) => row.parcelId === parcel.id))?.estimatedDeliveryAt ?? null,
      policyVersionId: input.policy?.ruleVersionId ?? null,
      policySnapshot: input.policy?.snapshot ?? null,
    });
  }

  const exceptionEvidence = hasCarrierException(input);
  if (exceptionEvidence.length > 0) {
    const action = input.policy?.defaultCustomerAction === 'refund' ? 'refund' : 'targeted_reship';
    return baseRecommendation(input, 'customer_action', {
      resultCode: action,
      assessmentState: 'likely',
      headline: action === 'refund' ? 'Refund under the merchant policy.' : 'Reship the affected item under the merchant policy.',
      explanation: 'The parcel has a carrier exception after handoff and the merchant policy can resolve the customer impact without waiting for liability to be proven.',
      reasonCodes: ['carrier_exception_after_handoff', 'customer_resolution_can_proceed'],
      supportingEvidenceIds: exceptionEvidence,
      conflictingEvidenceIds: [],
      missingEvidence: [],
      policyVersionId: input.policy?.ruleVersionId ?? null,
      policySnapshot: input.policy?.snapshot ?? null,
    });
  }

  const inconsistentPod = hasInconsistentPod(input);
  if (inconsistentPod.length > 0 || matrix.some((row) => row.state === 'delivered')) {
    const action = input.policy?.defaultCustomerAction
      ?? (input.policy?.allowTargetedReship === false ? 'manual_review' : 'targeted_reship');
    return baseRecommendation(input, 'customer_action', {
      resultCode: action,
      assessmentState: 'likely',
      headline: action === 'manual_review' ? 'Resolve according to merchant policy.' : 'Resolve the customer impact under merchant policy.',
      explanation: 'The item is associated with a delivered parcel, but responsibility is evaluated separately and may remain unresolved.',
      reasonCodes: ['delivered_claim', 'customer_resolution_independent_of_liability'],
      supportingEvidenceIds: [...inconsistentPod, ...matrix.flatMap((row) => row.evidenceIds)],
      conflictingEvidenceIds: [],
      missingEvidence: matrix.filter((row) => !row.physicalProof).flatMap((row) => row.missingEvidence),
      policyVersionId: input.policy?.ruleVersionId ?? null,
      policySnapshot: input.policy?.snapshot ?? null,
    });
  }

  if (claimIsMissingItem(input) && matrix.some((row) => row.state === 'not_recorded')) {
    const action = input.policy?.defaultCustomerAction ?? 'targeted_reship';
    return baseRecommendation(input, 'customer_action', {
      resultCode: action,
      assessmentState: 'likely',
      headline: action === 'targeted_reship' ? 'Reship the affected item under merchant policy.' : 'Resolve the missing item under merchant policy.',
      explanation: 'No shipment record currently accounts for the claimed item. Customer treatment can proceed while fulfilment evidence is requested.',
      reasonCodes: ['item_absent_from_shipment_records', 'customer_resolution_independent_of_liability'],
      supportingEvidenceIds: hasCustomerEvidence(input),
      conflictingEvidenceIds: [],
      missingEvidence: matrix.flatMap((row) => row.missingEvidence),
      policyVersionId: input.policy?.ruleVersionId ?? null,
      policySnapshot: input.policy?.snapshot ?? null,
    });
  }

  return baseRecommendation(input, 'customer_action', {
    resultCode: input.policy?.defaultCustomerAction ?? 'manual_review',
    assessmentState: 'unresolved',
    headline: 'Resolve according to merchant policy.',
    explanation: 'The available records do not support a safer specific customer action yet.',
    reasonCodes: ['insufficient_reconciled_evidence'],
    supportingEvidenceIds: hasCustomerEvidence(input),
    conflictingEvidenceIds: [],
    missingEvidence: ['the exact evidence that would change the customer decision'],
    policyVersionId: input.policy?.ruleVersionId ?? null,
    policySnapshot: input.policy?.snapshot ?? null,
  });
}

export function recommendResponsibility(
  input: ReconciliationInput,
  matrix: ItemParcelRow[] = buildItemParcelMatrix(input),
): ReconciliationRecommendation {
  if (input.identityConfirmed === false || input.orderConfirmed === false) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'unresolved',
      assessmentState: 'blocked',
      headline: 'Responsibility unresolved until the records are matched.',
      explanation: 'The case does not yet identify a single order, claimed item, or parcel with enough confidence to assess responsibility.',
      reasonCodes: ['identity_match_required'],
      supportingEvidenceIds: [],
      conflictingEvidenceIds: [],
      missingEvidence: ['confirmed order and claimed item match'],
    });
  }

  const exceptionEvidence = hasCarrierException(input);
  const inconsistentPod = hasInconsistentPod(input);
  if (exceptionEvidence.length > 0 || inconsistentPod.length > 0) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'carrier_side_likely',
      assessmentState: 'likely',
      headline: 'Carrier-side responsibility appears likely, not confirmed.',
      explanation: 'Carrier exception or contradictory delivery evidence points to the carrier after handoff. Merchant confirmation or a provider response is still required.',
      reasonCodes: exceptionEvidence.length > 0 ? ['carrier_exception_after_handoff'] : ['delivery_artifact_contradicts_address'],
      supportingEvidenceIds: [...exceptionEvidence, ...inconsistentPod],
      conflictingEvidenceIds: [],
      missingEvidence: ['carrier investigation response or merchant confirmation'],
    });
  }

  if (matrix.length > 0 && matrix.every((row) => row.state === 'in_transit')) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'no_loss_established',
      assessmentState: 'known',
      headline: 'No loss is currently established.',
      explanation: 'The claimed item is recorded in an active parcel that remains in transit.',
      reasonCodes: ['active_parcel', 'loss_not_yet_established'],
      supportingEvidenceIds: matrix.flatMap((row) => row.evidenceIds),
      conflictingEvidenceIds: [],
      missingEvidence: [],
    });
  }

  if (claimIsMissingItem(input) && matrix.some((row) => row.state === 'delivered' && !row.physicalProof)) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'unresolved',
      assessmentState: 'unresolved',
      headline: 'Responsibility unresolved — the shipment record is not physical pack proof.',
      explanation: 'The provider records the item against a delivered parcel, but no pick/pack, weight, or physical pack artifact is available to establish what was inside it.',
      reasonCodes: ['system_record_not_physical_proof', 'missing_pack_evidence'],
      supportingEvidenceIds: matrix.flatMap((row) => row.evidenceIds),
      conflictingEvidenceIds: [],
      missingEvidence: ['pick/pack scan', 'actual parcel weight', 'pack photo/video', 'warehouse investigation response'],
    });
  }

  if (matrix.some((row) => row.state === 'not_recorded')) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'fulfilment_side_likely',
      assessmentState: 'likely',
      headline: 'Fulfilment-side responsibility appears likely, not confirmed.',
      explanation: 'The claimed item is absent from the shipment records currently available. The fulfilment cause still needs an operational record or merchant confirmation.',
      reasonCodes: ['item_absent_from_shipment_records'],
      supportingEvidenceIds: hasCustomerEvidence(input),
      conflictingEvidenceIds: [],
      missingEvidence: ['fulfilment exception or pick/pack investigation response'],
    });
  }

  if (matrix.some((row) => row.state === 'delivered')) {
    return baseRecommendation(input, 'responsibility', {
      resultCode: 'unresolved',
      assessmentState: 'unresolved',
      headline: 'Responsibility unresolved — delivered scan alone is insufficient.',
      explanation: 'The carrier shows delivery, but no richer physical delivery artifact establishes delivery to the intended address or the parcel contents.',
      reasonCodes: ['delivered_scan_without_rich_pod'],
      supportingEvidenceIds: matrix.flatMap((row) => row.evidenceIds),
      conflictingEvidenceIds: [],
      missingEvidence: ['carrier photo, signature, GPS, or investigation response'],
    });
  }

  return baseRecommendation(input, 'responsibility', {
    resultCode: 'unresolved',
    assessmentState: 'unresolved',
    headline: 'Responsibility unresolved.',
    explanation: 'The available source facts do not support a defensible responsibility assessment.',
    reasonCodes: ['insufficient_reconciled_evidence'],
    supportingEvidenceIds: [],
    conflictingEvidenceIds: [],
    missingEvidence: ['the exact fulfilment or carrier artifact that could establish the loss point'],
  });
}

export function recommendRecovery(
  input: ReconciliationInput,
  matrix: ItemParcelRow[] = buildItemParcelMatrix(input),
  responsibility: ReconciliationRecommendation = recommendResponsibility(input, matrix),
): ReconciliationRecommendation {
  if (responsibility.resultCode === 'no_loss_established') {
    return baseRecommendation(input, 'recovery', {
      resultCode: 'none',
      assessmentState: 'not_applicable',
      headline: 'No recovery route yet.',
      explanation: 'No merchant loss has been established while the parcel remains within its delivery window.',
      reasonCodes: ['loss_not_yet_established'],
      supportingEvidenceIds: responsibility.supportingEvidenceIds,
      conflictingEvidenceIds: [],
      missingEvidence: [],
      contractVersionId: input.recoveryContract?.ruleVersionId ?? null,
      policySnapshot: input.recoveryContract?.snapshot ?? null,
    });
  }

  const owner = responsibility.resultCode === 'carrier_side_likely' ? 'carrier' : 'three_pl';
  const missing = responsibility.missingEvidence;
  const contract = input.recoveryContract;
  const deadlinePassed = dateIsPast(contract?.deadlineAt, nowFor(input));
  const contractReady = Boolean(contract?.eligible && !deadlinePassed);

  if (responsibility.resultCode === 'unresolved') {
    const requestCode = owner === 'carrier' ? 'request_carrier_pod' : 'request_three_pl_evidence';
    return baseRecommendation(input, 'recovery', {
      resultCode: requestCode,
      assessmentState: 'unresolved',
      headline: owner === 'carrier' ? 'Request carrier evidence before recovery.' : 'Request fulfilment evidence before recovery.',
      explanation: 'The case may have a recoverable loss, but the evidence currently does not establish responsibility or contract eligibility.',
      reasonCodes: ['responsibility_unresolved', 'recovery_requires_evidence'],
      supportingEvidenceIds: responsibility.supportingEvidenceIds,
      conflictingEvidenceIds: responsibility.conflictingEvidenceIds,
      missingEvidence: missing.length > 0 ? missing : ['provider response or physical evidence'],
      contractVersionId: contract?.ruleVersionId ?? null,
      policySnapshot: contract?.snapshot ?? null,
    });
  }

  if (!contractReady) {
    return baseRecommendation(input, 'recovery', {
      resultCode: 'gather_evidence',
      assessmentState: 'unresolved',
      headline: 'Recovery eligibility is not established.',
      explanation: deadlinePassed
        ? 'The configured provider deadline has passed or is no longer valid.'
        : 'No published, merchant-approved provider term currently establishes an eligible recovery route.',
      reasonCodes: deadlinePassed ? ['recovery_deadline_passed'] : ['recovery_contract_missing_or_unapproved'],
      supportingEvidenceIds: responsibility.supportingEvidenceIds,
      conflictingEvidenceIds: responsibility.conflictingEvidenceIds,
      missingEvidence: contract?.requiredEvidence ?? ['published provider contract or recovery rule'],
      contractVersionId: contract?.ruleVersionId ?? null,
      policySnapshot: contract?.snapshot ?? null,
    });
  }

  const resultCode = owner === 'carrier' ? 'prepare_carrier_claim' : 'prepare_three_pl_claim';
  return baseRecommendation(input, 'recovery', {
    resultCode,
    assessmentState: responsibility.assessmentState,
    headline: owner === 'carrier' ? 'Prepare a carrier recovery claim.' : 'Prepare a 3PL recovery request.',
    explanation: 'The current responsibility assessment and merchant-approved provider terms support preparing a recovery route. Submission remains a merchant action.',
    reasonCodes: ['provider_route_available', 'contract_and_deadline_valid'],
    supportingEvidenceIds: responsibility.supportingEvidenceIds,
    conflictingEvidenceIds: responsibility.conflictingEvidenceIds,
    missingEvidence: contract?.requiredEvidence ?? [],
    contractVersionId: contract?.ruleVersionId ?? null,
    policySnapshot: contract?.snapshot ?? null,
  });
}

export function evaluateReconciliation(input: ReconciliationInput) {
  const matrix = buildItemParcelMatrix(input);
  const customerAction = recommendCustomerAction(input, matrix);
  const responsibility = recommendResponsibility(input, matrix);
  const recovery = recommendRecovery(input, matrix, responsibility);
  return {
    matrix,
    recommendations: { customerAction, responsibility, recovery },
    inputHash: reconciliationInputHash(input),
  };
}
