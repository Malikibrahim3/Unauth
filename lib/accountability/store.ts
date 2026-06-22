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
  const { data, error } = await client
    .from(TABLES.LOSS_SOURCES as any)
    .insert({
      claim_id: input.claimId,
      merchant_id: input.merchantId,
      source_type: input.classification.source_type,
      confidence: input.classification.confidence,
      accountable_party_type: input.classification.accountable_party_type,
      accountable_party_name: input.classification.accountable_party_name,
      evidence_summary: input.agreement.reason ? `${input.classification.evidence_summary} Agreement check: ${input.agreement.reason}` : input.classification.evidence_summary,
      evidence_item_ids: input.evidenceItemIds,
      money_at_risk: input.classification.money_at_risk,
      potential_recovery_amount: potential,
      status,
    })
    .select('*')
    .single();
  if (error) throw new Error(`loss_source_insert_failed: ${error.message}`);
  await insertAccountabilityEvent(client, {
    merchantId: input.merchantId,
    claimId: input.claimId,
    lossSourceId: data.id,
    eventType: 'SOURCE_CLASSIFIED',
    description: `Likely source classified as ${input.classification.source_type}.`,
    metadata: { agreement: input.agreement },
  });
  return {
    ...(data as PersistedLossSource),
    money_at_risk: Number(data.money_at_risk ?? 0),
    potential_recovery_amount: Number(data.potential_recovery_amount ?? 0),
    recommended_recovery_tasks: input.classification.recommended_recovery_tasks,
  };
}

async function insertRecoveryTask(client: SupabaseClient, input: {
  merchantId: string;
  claimId: string;
  lossSourceId: string;
  task: RecommendedRecoveryTask;
  status?: string;
}): Promise<PersistedRecoveryTask> {
  const { data, error } = await client
    .from(TABLES.RECOVERY_TASKS as any)
    .insert({
      claim_id: input.claimId,
      merchant_id: input.merchantId,
      loss_source_id: input.lossSourceId,
      task_type: input.task.task_type,
      owner_type: input.task.owner_type,
      due_at: input.task.due_at,
      priority: input.task.priority,
      status: input.status ?? 'open',
      amount_to_recover: input.task.amount_to_recover,
      recovery_deadline: input.task.recovery_deadline,
      notes: input.task.notes,
    })
    .select('*')
    .single();
  if (error) throw new Error(`recovery_task_insert_failed: ${error.message}`);
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
    ...(data as PersistedRecoveryTask),
    amount_to_recover: Number(data.amount_to_recover ?? 0),
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
        task,
        status,
      }));
    }
  }

  return { evidenceItems, lossSources, recoveryTasks, agreementEvaluation: lastAgreement };
}

