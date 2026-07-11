import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { classifyLossSource } from '@/lib/accountability/classifyLossSource';
import type {
  AccountabilityResult,
  ClassifyLossSourceInput,
  EvidenceItemInput,
  LossSourceClassification,
  PersistedLossSource,
  PersistedRecoveryTask,
  RecommendedRecoveryTask,
} from '@/lib/accountability/types';
import { evaluateAgreementRules } from '@/lib/agreements/evaluateAgreementRules';

function evidenceInputs(input: ClassifyLossSourceInput): EvidenceItemInput[] {
  const evidence = input.evidence;
  const items: EvidenceItemInput[] = [
    {
      source_system: 'GORGIAS',
      evidence_type: 'CUSTOMER_MESSAGE',
      title: 'Customer claim message',
      summary: input.evidence.ticket?.subject ? String(input.evidence.ticket.subject) : 'Claim text captured from gate request',
      raw_payload: input.evidence.ticket,
      proves: 'Customer requested post-purchase action',
    },
  ];
  if (evidence.order) {
    items.push({
      source_system: 'SHOPIFY',
      evidence_type: 'ORDER',
      title: 'Order record',
      summary: `Order value ${evidence.moneyAtRisk} ${evidence.currency}`,
      raw_payload: evidence.order,
      occurred_at: typeof evidence.order.placed_at === 'string' ? evidence.order.placed_at : null,
      proves: 'Money at risk and order context',
    });
  }
  if (evidence.shipment) {
    items.push({
      source_system: 'SHOPIFY',
      evidence_type: 'FULFILLMENT',
      title: 'Fulfillment / tracking record',
      summary: `Delivery status ${evidence.summary.delivery_status}; proof of delivery ${evidence.summary.proof_of_delivery}`,
      raw_payload: evidence.shipment,
      occurred_at: typeof evidence.shipment.occurred_at === 'string' ? evidence.shipment.occurred_at : null,
      proves: 'Shipment status and carrier evidence',
    });
  }
  for (const rule of input.gateDecision.triggeredRules) {
    items.push({
      source_system: 'OTHER',
      evidence_type: 'POLICY_RULE',
      title: rule.rule_name,
      summary: rule.reason,
      raw_payload: rule as unknown as Record<string, unknown>,
      proves: 'Merchant-configured rule triggered',
    });
  }
  return items;
}

async function insertEvidenceItems(client: SupabaseClient, input: ClassifyLossSourceInput) {
  const rows = evidenceInputs(input).map((item) => ({
    claim_id: input.claimId,
    merchant_id: input.merchantId,
    ...item,
  }));
  const { data, error } = await client
    .from(TABLES.EVIDENCE_ITEMS as any)
    .insert(rows)
    .select('id,title,evidence_type');
  if (error) throw new Error(`evidence_items_insert_failed: ${error.message}`);
  return (data ?? []) as Array<{ id: string; title: string; evidence_type: string }>;
}

async function insertAccountabilityEvent(client: SupabaseClient, input: {
  merchantId: string;
  claimId: string;
  lossSourceId?: string | null;
  recoveryTaskId?: string | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await client.from(TABLES.ACCOUNTABILITY_EVENTS as any).insert({
    claim_id: input.claimId,
    merchant_id: input.merchantId,
    loss_source_id: input.lossSourceId ?? null,
    recovery_task_id: input.recoveryTaskId ?? null,
    event_type: input.eventType,
    actor_type: 'SYSTEM',
    description: input.description,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(`accountability_event_insert_failed: ${error.message}`);
}

function taskWithAgreement(task: RecommendedRecoveryTask, agreement: Awaited<ReturnType<typeof evaluateAgreementRules>>): RecommendedRecoveryTask {
  if (agreement.recovery_eligible === false) {
    return {
      ...task,
      task_type: 'WRITE_OFF_APPROVAL',
      owner_type: 'FINANCE',
      priority: 'MEDIUM',
      amount_to_recover: 0,
      recovery_deadline: agreement.deadline,
      notes: agreement.reason,
    };
  }
  if (agreement.recovery_eligible === 'pending_evidence') {
    return {
      ...task,
      task_type: agreement.recommended_task ?? 'REQUEST_CUSTOMER_EVIDENCE',
      owner_type: 'CX_MANAGER',
      priority: 'HIGH',
      amount_to_recover: 0,
      recovery_deadline: agreement.deadline,
      notes: `Missing required evidence: ${agreement.missing_evidence.join(', ') || 'Evidence required by agreement'}. ${agreement.reason}`,
    };
  }
  if (agreement.recovery_eligible === true) {
    return {
      ...task,
      task_type: agreement.recommended_task ?? task.task_type,
      amount_to_recover: agreement.expected_recovery_amount || task.amount_to_recover,
      recovery_deadline: agreement.deadline ?? task.recovery_deadline,
      notes: agreement.reason,
    };
  }
  return task;
}

/** Map the accountability party taxonomy onto the canonical loss counterparty enum. */
function counterpartyType(party: string): string {
  switch (party) {
    case 'CUSTOMER':
      return 'customer';
    case 'CARRIER':
      return 'carrier';
    case 'WAREHOUSE_3PL':
      return '3pl';
    case 'PAYMENT_PROVIDER':
      return 'payment_processor';
    case 'MERCHANT':
    case 'SUPPORT_TEAM':
    case 'AI_AGENT':
      return 'internal_team';
    default:
      return 'unknown';
  }
}

function candidateConfidence(confidence: string): number {
  switch (confidence) {
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 0.6;
    default:
      return 0.3;
  }
}

async function insertLossSource(client: SupabaseClient, input: {
  classification: LossSourceClassification;
  merchantId: string;
  claimId: string;
  evidenceItemIds: string[];
  agreement: Awaited<ReturnType<typeof evaluateAgreementRules>>;
}): Promise<PersistedLossSource> {
  const status = input.agreement.recovery_eligible === false
    ? 'not_economically_recoverable'
    : input.agreement.recovery_eligible === 'pending_evidence'
      ? 'pending_required_evidence'
      : input.agreement.recovery_eligible === true
        ? 'eligible_to_chase'
        : 'open';
  const potential = input.agreement.recovery_eligible === false
    ? 0
    : input.agreement.expected_recovery_amount || input.classification.potential_recovery_amount;
  const evidenceSummary = input.agreement.reason
    ? `${input.classification.evidence_summary} Agreement check: ${input.agreement.reason}`
    : input.classification.evidence_summary;
  const nowIso = new Date().toISOString();

  // Canonical loss record. `case_type`/`attribution` retain the fine-grained
  // accountability source type; the workflow status is preserved in metadata and
  // in `recoverability` while `status` uses the canonical loss lifecycle enum.
  const { data: lossCase, error } = await client
    .from(TABLES.LOSS_CASES as any)
    .insert({
      merchant_id: input.merchantId,
      support_payout_case_id: input.claimId,
      case_category: 'unknown_post_purchase_loss',
      case_type: input.classification.source_type.toLowerCase(),
      recovery_route: 'needs_more_evidence',
      status: 'detected',
      counterparty_type: counterpartyType(input.classification.accountable_party_type),
      counterparty_name: input.classification.accountable_party_name,
      estimated_recovery_minor: Math.round(potential * 100),
      source_confidence: 'insufficient_source_data',
      source_fingerprint: `accountability:${input.claimId}:${input.classification.source_type}`,
      attribution: input.classification.source_type,
      attribution_confidence: candidateConfidence(input.classification.confidence),
      recoverability: status,
      estimated_at: nowIso,
      source_metadata: {
        origin: 'accountability_workflow',
        money_at_risk: input.classification.money_at_risk,
        evidence_summary: evidenceSummary,
        evidence_item_ids: input.evidenceItemIds,
        workflow_status: status,
        agreement_reason: input.agreement.reason ?? null,
      },
    })
    .select('id')
    .single();
  if (error) throw new Error(`loss_case_insert_failed: ${error.message}`);

  // Primary attribution candidate; alternate attributions attach here without
  // creating a second double-counted loss record.
  const { error: candidateError } = await client
    .from(TABLES.LOSS_ATTRIBUTION_CANDIDATES as any)
    .insert({
      merchant_id: input.merchantId,
      loss_case_id: lossCase.id,
      attribution: input.classification.source_type,
      confidence: candidateConfidence(input.classification.confidence),
      accountable_party_type: input.classification.accountable_party_type,
      accountable_party_name: input.classification.accountable_party_name,
      is_primary: true,
      metadata: { evidence_summary: evidenceSummary },
    });
  if (candidateError) throw new Error(`loss_attribution_candidate_insert_failed: ${candidateError.message}`);

  await insertAccountabilityEvent(client, {
    merchantId: input.merchantId,
    claimId: input.claimId,
    lossSourceId: lossCase.id,
    eventType: 'SOURCE_CLASSIFIED',
    description: `Likely source classified as ${input.classification.source_type}.`,
    metadata: { agreement: input.agreement },
  });
  return {
    ...input.classification,
    id: lossCase.id,
    claim_id: input.claimId,
    merchant_id: input.merchantId,
    evidence_item_ids: input.evidenceItemIds,
    potential_recovery_amount: potential,
    status,
  };
}

/**
 * Map an accountability workflow status (e.g. `eligible_to_chase`) onto the canonical
 * `work_tasks.status` CHECK domain. The original workflow status is preserved verbatim
 * in `source_metadata.workflow_status` and in the returned {@link PersistedRecoveryTask}
 * so the Gorgias widget / gate response contract is unchanged.
 */
function workTaskStatus(workflowStatus: string | undefined): {
  status: string;
  blockingReason: string | null;
} {
  switch (workflowStatus) {
    case 'not_economically_recoverable':
      return { status: 'blocked', blockingReason: 'Not economically recoverable' };
    case 'pending_required_evidence':
      return { status: 'blocked', blockingReason: 'Awaiting required evidence' };
    case 'in_progress':
    case 'blocked':
    case 'completed':
    case 'cancelled':
      return { status: workflowStatus, blockingReason: null };
    // 'eligible_to_chase', 'open', undefined and anything else → an actionable task.
    default:
      return { status: 'open', blockingReason: null };
  }
}

function workTaskTitle(taskType: string): string {
  return taskType
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

async function insertRecoveryTask(client: SupabaseClient, input: {
  merchantId: string;
  claimId: string;
  lossSourceId: string;
  lossCaseId: string | null;
  task: RecommendedRecoveryTask;
  status?: string;
}): Promise<PersistedRecoveryTask> {
  const mapped = workTaskStatus(input.status);
  const { data, error } = await client
    .from(TABLES.WORK_TASKS as any)
    .insert({
      merchant_id: input.merchantId,
      support_payout_case_id: input.claimId,
      loss_case_id: input.lossCaseId,
      title: workTaskTitle(input.task.task_type),
      description: input.task.notes,
      owner_role: input.task.owner_type,
      due_at: input.task.due_at ?? input.task.recovery_deadline,
      priority: input.task.priority.toLowerCase(),
      status: mapped.status,
      blocking_reason: mapped.blockingReason,
      source: 'accountability_workflow',
      source_metadata: {
        task_type: input.task.task_type,
        owner_type: input.task.owner_type,
        amount_to_recover: input.task.amount_to_recover,
        recovery_deadline: input.task.recovery_deadline,
        loss_source_id: input.lossSourceId,
        workflow_status: input.status ?? 'open',
      },
    })
    .select('id')
    .single();
  if (error) throw new Error(`work_task_insert_failed: ${error.message}`);
  await insertAccountabilityEvent(client, {
    merchantId: input.merchantId,
    claimId: input.claimId,
    lossSourceId: input.lossSourceId,
    recoveryTaskId: data.id,
    eventType: 'RECOVERY_TASK_CREATED',
    description: `Recovery task created: ${input.task.task_type}.`,
    metadata: { task: input.task },
  });
  return {
    ...input.task,
    id: data.id,
    claim_id: input.claimId,
    merchant_id: input.merchantId,
    loss_source_id: input.lossSourceId,
    amount_to_recover: Number(input.task.amount_to_recover ?? 0),
    status: input.status ?? 'open',
  };
}

export async function createAccountabilityWorkflow(
  client: SupabaseClient,
  input: ClassifyLossSourceInput,
): Promise<AccountabilityResult> {
  const evidenceItems = await insertEvidenceItems(client, input);
  const evidenceItemIds = evidenceItems.map((item) => item.id);
  const classifications = classifyLossSource(input);
  const lossSources: PersistedLossSource[] = [];
  const recoveryTasks: PersistedRecoveryTask[] = [];
  let lastAgreement: AccountabilityResult['agreementEvaluation'] | undefined;

  for (const classification of classifications) {
    const agreement = await evaluateAgreementRules({
      client,
      merchantId: input.merchantId,
      claimId: input.claimId,
      claimType: input.claimType,
      evidence: input.evidence,
      lossSource: classification,
    });
    lastAgreement = agreement;
    const lossSource = await insertLossSource(client, {
      classification,
      merchantId: input.merchantId,
      claimId: input.claimId,
      evidenceItemIds,
      agreement,
    });
    lossSources.push(lossSource);

    for (const originalTask of classification.recommended_recovery_tasks) {
      const task = taskWithAgreement(originalTask, agreement);
      const status = agreement.recovery_eligible === false
        ? 'not_economically_recoverable'
        : agreement.recovery_eligible === 'pending_evidence'
          ? 'pending_required_evidence'
          : agreement.recovery_eligible === true
            ? 'eligible_to_chase'
            : undefined;
      if (agreement.recovery_eligible === false && originalTask.task_type === 'OPEN_CARRIER_CLAIM') continue;
      recoveryTasks.push(await insertRecoveryTask(client, {
        merchantId: input.merchantId,
        claimId: input.claimId,
        lossSourceId: lossSource.id,
        lossCaseId: lossSource.id,
        task,
        status,
      }));
    }
  }

  return { evidenceItems, lossSources, recoveryTasks, agreementEvaluation: lastAgreement };
}

