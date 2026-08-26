import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateReconciliation } from "@/lib/reconciliation/recommendations";
import { buildReconciliationInput } from "@/lib/reconciliation/caseStore";
import type {
  ItemParcelRow,
  ReconciliationFact,
  ReconciliationInput,
} from "@/lib/reconciliation/types";
import { findBestPartnerRecoveryRule } from "@/lib/partners/store";
import type { PartnerRecoveryRule } from "@/lib/partners/types";
import { getRecoveryCaseForSupportPayoutCase } from "@/lib/recoveries/store";
import type {
  RecoveryCase,
  RecoveryClaimPack,
  RecoveryClaimSubmission,
  RecoveryProviderResponse,
} from "@/lib/recoveries/types";
import {
  evaluateProviderClaimReadiness,
  type ClaimGateState,
  type ProviderClaimReadiness,
} from "@/lib/recoveries/claimReadiness";
import {
  resolveCaseSourceClass,
  sourceLineageRootId,
  type CaseSourceClass,
} from "@/lib/evidence/sourceClasses";
import { TABLES } from "@/lib/supabase/tables";
import { majorToMinor } from "@/lib/ui/merchantCopy";
import { formatMinorCurrencyNullable } from "@/lib/utils/format";

type UntypedClient = { from: (table: string) => any };

function db(client: SupabaseClient): UntypedClient {
  return client as unknown as UntypedClient;
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function rows(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function majorAmountToMinor(value: unknown, currency: unknown): number | null {
  const major = numberOrNull(value);
  const code = stringOrNull(currency)?.toUpperCase() ?? null;
  if (major == null || !code) return null;
  try {
    return majorToMinor(major, code);
  } catch {
    return null;
  }
}

function dateSort(
  a: { occurredAt?: string | null; createdAt?: string | null },
  b: { occurredAt?: string | null; createdAt?: string | null },
): number {
  return (
    Date.parse(b.occurredAt ?? b.createdAt ?? "") -
    Date.parse(a.occurredAt ?? a.createdAt ?? "")
  );
}

export type CaseEvidenceRecord = {
  id: string;
  title: string;
  sourceClass: CaseSourceClass | null;
  system: string;
  sourceRecordId: string | null;
  originalUrl: string | null;
  storagePath: string | null;
  eventAt: string | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  ingestedAt: string | null;
  freshness: string;
  factKind: "source_fact" | "human_finding" | "inference";
  evidenceType: string;
  summary: string;
  attachment: { storagePath: string; contentHash: string | null } | null;
  contentHash: string | null;
  lineageRootId: string;
  supports: string[];
  conflicts: string[];
  allowedInProviderPack: boolean;
  linkedScope: {
    orderLineId: string | null;
    itemId: string | null;
    parcelId: string | null;
    shipmentLineId: string | null;
  };
};

export type CustodyChainState =
  "met" | "missing" | "conflicting" | "unavailable";
export type CustodyChainEvent = {
  id:
    | "store_instruction"
    | "three_pl_pick_pack"
    | "three_pl_handoff"
    | "courier_transit"
    | "delivery";
  label: string;
  state: CustodyChainState;
  occurredAt: string | null;
  summary: string;
  evidenceIds: string[];
  nextAction: string;
};

export type ApparentResponsibility = {
  owner:
    | "merchant"
    | "three_pl"
    | "courier"
    | "supplier"
    | "unresolved"
    | "none_established";
  confidence: "known" | "likely" | "unresolved" | "blocked" | "not_applicable";
  headline: string;
  explanation: string;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  missingEvidence: string[];
  merchantConfirmed: boolean;
  merchantConfirmationState: "unconfirmed" | "confirmed" | "corrected";
  merchantConfirmedAt: string | null;
  confirmationSource: string | null;
};

export type CaseActivity = {
  id: string;
  occurredAt: string | null;
  kind:
    | "source"
    | "finding"
    | "recommendation"
    | "merchant_confirmation"
    | "external_action"
    | "external_outcome"
    | "submission"
    | "provider_response"
    | "credit"
    | "audit";
  title: string;
  summary: string;
  sourceId: string | null;
  sourceClass: CaseSourceClass | null;
};

export type CaseDecisionRecord = {
  id: string;
  decision: string;
  action: string | null;
  amountMinor: number | null;
  currency: string | null;
  reason: string | null;
  actorUserId: string | null;
  effectiveAt: string | null;
  recordedAt: string | null;
  reversesDecisionId: string | null;
  supersedesDecisionId: string | null;
};

export type CaseExternalActionRecord = {
  id: string;
  capabilityId: string;
  externalRecordId: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

export type CaseOutcomeRecord = {
  id: string;
  outcomeType: string;
  state: string;
  sourceSystem: string;
  sourceRecordId: string | null;
  sourceExternalId: string | null;
  correlationMethod: string | null;
  matchStatus: string;
  amountMinor: number | null;
  currency: string | null;
  actorUserId: string | null;
  observedAt: string | null;
  occurredAt: string | null;
};

export type CaseEvidenceFile = {
  version: "case-evidence-file-v1";
  claim: {
    id: string;
    merchantId: string;
    claimType: string | null;
    issueSummary: string;
    requestedAction: string | null;
    customerName: string | null;
    orderId: string | null;
    orderReference: string | null;
    ticketId: string | null;
    ticketReference: string | null;
    amountAtRiskMinor: number | null;
    currency: string | null;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
  evidence: CaseEvidenceRecord[];
  customerHistory: CaseEvidenceRecord[];
  custodyChain: CustodyChainEvent[];
  firstEvidencedFailure: {
    stage: string | null;
    occurredAt: string | null;
    summary: string | null;
    evidenceIds: string[];
  };
  itemParcelMatrix: ItemParcelRow[];
  apparentResponsibility: ApparentResponsibility;
  responsibilityRecommendation: Record<string, unknown> | null;
  providerClaimReadiness: ProviderClaimReadiness;
  partnerRule: PartnerRecoveryRule | null;
  recoveryCase: RecoveryCase | null;
  claimPacks: RecoveryClaimPack[];
  submissions: RecoveryClaimSubmission[];
  providerResponses: RecoveryProviderResponse[];
  credits: Record<string, unknown>[];
  financialEntries: Record<string, unknown>[];
  decisions: CaseDecisionRecord[];
  externalActions: CaseExternalActionRecord[];
  outcomes: CaseOutcomeRecord[];
  activity: CaseActivity[];
  availability: {
    case: "available" | "unavailable";
    evidence: "available" | "unavailable";
    recovery: "available" | "unavailable" | "not_opened";
    rule: "available" | "unavailable" | "not_confirmed";
    errors: string[];
  };
};

async function safeQuery<T>(
  label: string,
  operation: () => Promise<{ data: T; error: { message?: string } | null }>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await operation();
    return result.error
      ? {
          data: null,
          error: `${label}: ${result.error.message ?? "unavailable"}`,
        }
      : { data: result.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: `${label}: ${error instanceof Error ? error.message : "unavailable"}`,
    };
  }
}

function sourceRecord(
  row: Record<string, any>,
  link: Record<string, any> | undefined,
): CaseEvidenceRecord {
  const sourceClass = resolveCaseSourceClass(row);
  const metadata = record(row.source_metadata);
  const structured = record(row.structured_value);
  const supports = Array.isArray(structured.supports)
    ? structured.supports.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const conflicts = Array.isArray(structured.conflicts)
    ? structured.conflicts.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const storagePath = stringOrNull(row.storage_path);
  return {
    id: String(row.id),
    title: stringOrNull(row.title) ?? String(row.evidence_type ?? "Evidence"),
    sourceClass,
    system: String(row.source_system ?? "unknown"),
    sourceRecordId: stringOrNull(
      row.source_record_id ?? metadata.external_record_id,
    ),
    originalUrl: stringOrNull(row.source_url ?? row.external_url),
    storagePath,
    eventAt: stringOrNull(row.occurred_at ?? row.source_created_at),
    sourceCreatedAt: stringOrNull(row.source_created_at),
    sourceUpdatedAt: stringOrNull(row.source_updated_at),
    ingestedAt: stringOrNull(row.ingested_at ?? row.created_at),
    freshness: String(row.freshness_state ?? "unknown"),
    factKind:
      row.fact_kind === "human_finding" || row.fact_kind === "inference"
        ? row.fact_kind
        : "source_fact",
    evidenceType: String(row.evidence_type ?? "unknown"),
    summary:
      stringOrNull(row.summary ?? row.proves) ??
      "Source evidence summary unavailable.",
    attachment: storagePath
      ? { storagePath, contentHash: stringOrNull(row.content_hash) }
      : null,
    contentHash: stringOrNull(row.content_hash),
    lineageRootId: sourceLineageRootId({
      id: String(row.id),
      source_lineage_root_id: stringOrNull(row.source_lineage_root_id),
    }),
    supports,
    conflicts,
    allowedInProviderPack:
      sourceClass != null && sourceClass !== "customer_history",
    linkedScope: {
      orderLineId: stringOrNull(
        link?.source_order_line_id ?? structured.source_order_line_id,
      ),
      itemId: stringOrNull(
        link?.case_claimed_item_id ?? structured.case_claimed_item_id,
      ),
      parcelId: stringOrNull(
        link?.source_shipment_id ?? structured.source_shipment_id,
      ),
      shipmentLineId: stringOrNull(
        link?.source_shipment_line_id ?? structured.source_shipment_line_id,
      ),
    },
  };
}

function factMatches(
  facts: ReconciliationFact[],
  predicate: (fact: ReconciliationFact) => boolean,
): string[] {
  return facts.filter(predicate).map((fact) => fact.id);
}

function buildCustodyChain(
  input: ReconciliationInput,
  evidence: CaseEvidenceRecord[],
): CustodyChainEvent[] {
  const nonHistory = evidence.filter(
    (item) => item.sourceClass !== "customer_history",
  );
  const ids = (
    types: string[],
    extra?: (fact: ReconciliationFact) => boolean,
  ) => {
    const lower = new Set(types.map((type) => type.toLowerCase()));
    return input.facts
      .filter(
        (fact) => lower.has(fact.evidenceType.toLowerCase()) || extra?.(fact),
      )
      .map((fact) => fact.id);
  };
  const sourceIdsFor = (idsToMatch: string[]) =>
    nonHistory
      .filter((item) => idsToMatch.includes(item.id))
      .map((item) => item.id);
  const storeIds = ids(
    [
      "order_created",
      "order_line",
      "store_instruction",
      "fulfilment_instruction",
      "customer_statement",
    ],
    (fact) =>
      fact.sourceProvider.toLowerCase().includes("shopify") ||
      fact.sourceProvider.toLowerCase().includes("store"),
  );
  const pickPackIds = ids(
    [
      "pick_scan",
      "pack_scan",
      "parcel_weight",
      "pack_photo",
      "pack_video",
      "short_pick",
      "mispick",
    ],
    (fact) =>
      fact.sourceProvider.toLowerCase().includes("3pl") ||
      fact.sourceProvider.toLowerCase().includes("warehouse") ||
      fact.sourceProvider.toLowerCase().includes("wms"),
  );
  const handoffIds = ids(
    ["handoff", "carrier_acceptance", "manifest", "dispatch_scan", "shipped"],
    (fact) =>
      fact.sourceProvider.toLowerCase().includes("courier") &&
      fact.evidenceType.toLowerCase().includes("accept"),
  );
  const transitIds = ids(
    [
      "transit_scan",
      "tracking_event",
      "carrier_exception",
      "carrier_loss",
      "carrier_damage",
    ],
    (fact) =>
      fact.sourceProvider.toLowerCase().includes("carrier") ||
      fact.sourceProvider.toLowerCase().includes("courier"),
  );
  const deliveryIds = ids(
    ["delivery_scan", "delivery_photo", "signature", "gps", "pod", "delivered"],
    (fact) =>
      fact.evidenceType.toLowerCase().includes("delivery") ||
      fact.evidenceType.toLowerCase().includes("pod"),
  );
  const podConflictIds = factMatches(
    input.facts,
    (fact) =>
      ["pod_conflict", "delivery_conflict"].includes(
        fact.evidenceType.toLowerCase(),
      ) || String(fact.value?.finding ?? "").toLowerCase() === "inconsistent",
  );
  const itemParcelHas = input.parcels.length > 0;
  const state = (
    eventIds: string[],
    unavailable = false,
    conflicting = false,
  ): CustodyChainState =>
    conflicting
      ? "conflicting"
      : unavailable
        ? "unavailable"
        : eventIds.length > 0
          ? "met"
          : "missing";
  return [
    {
      id: "store_instruction",
      label: "Store instruction",
      state: state(storeIds, !itemParcelHas && storeIds.length === 0),
      occurredAt:
        input.facts.find((fact) => storeIds.includes(fact.id))?.occurredAt ??
        null,
      summary: storeIds.length
        ? "The order and claimed item are represented in store records."
        : "The order instruction or item scope is not evidenced.",
      evidenceIds: sourceIdsFor(storeIds),
      nextAction: storeIds.length
        ? "No action required."
        : "Confirm the order line and claimed item.",
    },
    {
      id: "three_pl_pick_pack",
      label: "3PL pick / pack",
      state: state(pickPackIds, !itemParcelHas),
      occurredAt:
        input.facts.find((fact) => pickPackIds.includes(fact.id))?.occurredAt ??
        null,
      summary: pickPackIds.length
        ? "A fulfilment pick, pack, weight, or exception record is present."
        : "No physical pick/pack evidence is recorded.",
      evidenceIds: sourceIdsFor(pickPackIds),
      nextAction: pickPackIds.length
        ? "No action required."
        : "Request pick/pack, weight, or warehouse evidence.",
    },
    {
      id: "three_pl_handoff",
      label: "3PL → carrier handoff",
      state: state(handoffIds, !itemParcelHas),
      occurredAt:
        input.facts.find((fact) => handoffIds.includes(fact.id))?.occurredAt ??
        null,
      summary: handoffIds.length
        ? "A dispatch or carrier acceptance event is recorded."
        : "The handoff is not independently evidenced.",
      evidenceIds: sourceIdsFor(handoffIds),
      nextAction: handoffIds.length
        ? "No action required."
        : "Confirm the dispatch manifest or carrier acceptance.",
    },
    {
      id: "courier_transit",
      label: "Courier transit",
      state: state(transitIds, !itemParcelHas),
      occurredAt:
        input.facts.find((fact) => transitIds.includes(fact.id))?.occurredAt ??
        null,
      summary: transitIds.length
        ? "Courier tracking or an exception is recorded."
        : "Courier transit evidence is unavailable.",
      evidenceIds: sourceIdsFor(transitIds),
      nextAction: transitIds.length
        ? "No action required."
        : "Refresh courier tracking or request provider evidence.",
    },
    {
      id: "delivery",
      label: "Delivery",
      state: state(deliveryIds, !itemParcelHas, podConflictIds.length > 0),
      occurredAt:
        input.facts.find((fact) => deliveryIds.includes(fact.id))?.occurredAt ??
        null,
      summary: podConflictIds.length
        ? "Delivery evidence conflicts with another finding."
        : deliveryIds.length
          ? "A delivery scan or delivery artifact is recorded."
          : "No delivery artifact is recorded.",
      evidenceIds: sourceIdsFor([...deliveryIds, ...podConflictIds]),
      nextAction: podConflictIds.length
        ? "Resolve the conflicting delivery evidence."
        : deliveryIds.length
          ? "No action required."
          : "Request delivery or non-delivery evidence.",
    },
  ];
}

function apparentResponsibility(
  recommendation: Record<string, any> | null,
  claim: Record<string, any>,
): ApparentResponsibility {
  const code = String(
    recommendation?.result_code ?? recommendation?.resultCode ?? "unresolved",
  );
  const assessment = String(
    recommendation?.assessment_state ??
      recommendation?.assessmentState ??
      "unresolved",
  ) as ApparentResponsibility["confidence"];
  const owner = code.includes("carrier")
    ? "courier"
    : code.includes("fulfilment") ||
        code.includes("three_pl") ||
        code.includes("warehouse")
      ? "three_pl"
      : code.includes("merchant") || code.includes("store")
        ? "merchant"
        : code === "no_loss_established"
          ? "none_established"
          : "unresolved";
  const supporting = (
    recommendation?.supporting_evidence_ids ??
    recommendation?.supportingEvidenceIds ??
    []
  ).filter((id: unknown): id is string => typeof id === "string");
  const conflicting = (
    recommendation?.conflicting_evidence_ids ??
    recommendation?.conflictingEvidenceIds ??
    []
  ).filter((id: unknown): id is string => typeof id === "string");
  const missing = (
    recommendation?.missing_evidence ??
    recommendation?.missingEvidence ??
    []
  ).filter((value: unknown): value is string => typeof value === "string");
  const confirmationState = ["unconfirmed", "confirmed", "corrected"].includes(
    String(claim.responsibility_confirmation_state),
  )
    ? (String(
        claim.responsibility_confirmation_state,
      ) as ApparentResponsibility["merchantConfirmationState"])
    : "unconfirmed";
  const confirmed = confirmationState !== "unconfirmed";
  return {
    owner,
    confidence: [
      "known",
      "likely",
      "unresolved",
      "blocked",
      "not_applicable",
    ].includes(assessment)
      ? assessment
      : "unresolved",
    headline: String(recommendation?.headline ?? "Responsibility unresolved."),
    explanation: String(
      recommendation?.explanation ??
        "The available source facts do not establish a defensible responsibility assessment.",
    ),
    supportingEvidenceIds: supporting,
    conflictingEvidenceIds: conflicting,
    missingEvidence: missing,
    merchantConfirmed: confirmed,
    merchantConfirmationState: confirmationState,
    merchantConfirmedAt: stringOrNull(claim.responsibility_confirmed_at),
    confirmationSource: confirmed
      ? `Merchant responsibility ${confirmationState} on ${stringOrNull(claim.responsibility_confirmed_at) ?? "recorded timestamp unavailable"}`
      : null,
  };
}

function buildReadiness(
  input: ReconciliationInput,
  evidence: CaseEvidenceRecord[],
  chain: CustodyChainEvent[],
  responsibility: ApparentResponsibility,
  recoveryCase: RecoveryCase | null,
  rule: PartnerRecoveryRule | null,
  now: string,
): ProviderClaimReadiness {
  const sourceFacts = evidence.filter(
    (item) => item.sourceClass !== "customer_history",
  );
  const evidenceIds = (predicate: (item: CaseEvidenceRecord) => boolean) =>
    sourceFacts.filter(predicate).map((item) => item.id);
  const chainConflict = chain.some((event) => event.state === "conflicting");
  const chainMissing = chain.some(
    (event) => event.state === "missing" || event.state === "unavailable",
  );
  const ruleConfirmed = Boolean(
    rule && rule.rule_approval_status === "approved" && rule.active,
  );
  const deadline = recoveryCase?.deadline_at ?? null;
  const deadlineState: ClaimGateState =
    !rule || !ruleConfirmed || !deadline
      ? "unavailable"
      : Date.parse(deadline) < Date.parse(now)
        ? "expired"
        : "met";
  const coveredIds = evidenceIds((item) =>
    /loss|damage|exception|missing|short_pick|mispick|not_received|delivery_conflict/i.test(
      item.evidenceType,
    ),
  );
  const issueIds = evidenceIds((item) =>
    /customer|ticket|missing|damage|wrong|issue|not_received|delivery_conflict/i.test(
      `${item.evidenceType} ${item.summary}`,
    ),
  );
  const valueIds = evidenceIds(
    (item) =>
      /order|invoice|value|price|line/i.test(
        `${item.evidenceType} ${item.summary}`,
      ) || Boolean(item.linkedScope.orderLineId),
  );
  const amount = recoveryCase?.amount_sought_minor ?? null;
  const cap =
    rule?.liability_cap_amount == null
      ? null
      : Math.round(rule.liability_cap_amount * 100);
  const amountMet =
    amount != null &&
    amount > 0 &&
    Boolean(recoveryCase?.currency) &&
    (cap == null || amount <= cap);
  const readiness = evaluateProviderClaimReadiness({
    now,
    ruleVersionId: rule?.id ?? null,
    ruleConfirmed,
    claimantAuthority: {
      present: Boolean(recoveryCase?.partner_id || recoveryCase?.owner_type),
      evidenceIds: [],
    },
    shipmentIdentity: {
      present: Boolean(
        input.claimedItems.length &&
        input.parcels.length &&
        input.parcels.every((parcel) => parcel.trackingNumber || parcel.id),
      ),
      evidenceIds: input.parcels.map((parcel) => parcel.id),
    },
    custodyEstablished: {
      present: !chainMissing && !chainConflict,
      conflicting: chainConflict,
      evidenceIds: chain.flatMap((event) => event.evidenceIds),
    },
    coveredEvent: {
      present:
        coveredIds.length > 0 && responsibility.owner !== "none_established",
      evidenceIds: coveredIds,
    },
    deadlineOpen: { state: deadlineState, evidenceIds: [] },
    issueEvidence: { present: issueIds.length > 0, evidenceIds: issueIds },
    valueSubstantiated: { present: valueIds.length > 0, evidenceIds: valueIds },
    amountBounded: {
      present: amountMet,
      reason:
        amount == null
          ? undefined
          : cap != null && amount > cap
            ? "The requested amount exceeds the configured provider cap."
            : undefined,
      evidenceIds: valueIds,
    },
    exclusionsAndPreservation: {
      present: Boolean(
        rule &&
        sourceFacts.length > 0 &&
        sourceFacts.every((item) => item.allowedInProviderPack),
      ),
      evidenceIds: sourceFacts.map((item) => item.id),
    },
    responsibilityAssessment: responsibility.confidence,
    sourceClasses: [
      ...new Set(
        sourceFacts
          .map((item) => item.sourceClass)
          .filter((value): value is CaseSourceClass => Boolean(value)),
      ),
    ],
  });
  return readiness;
}

function packSource(record: CaseEvidenceRecord) {
  return {
    id: record.id,
    sourceClass: record.sourceClass,
    system: record.system,
    sourceRecordId: record.sourceRecordId,
    originalUrl: record.originalUrl,
    storagePath: record.storagePath,
    eventAt: record.eventAt,
    sourceCreatedAt: record.sourceCreatedAt,
    sourceUpdatedAt: record.sourceUpdatedAt,
    ingestedAt: record.ingestedAt,
    freshness: record.freshness,
    factKind: record.factKind,
    evidenceType: record.evidenceType,
    summary: record.summary,
    contentHash: record.contentHash,
    lineageRootId: record.lineageRootId,
    supports: record.supports,
    conflicts: record.conflicts,
  };
}

export async function loadCaseEvidenceFile(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
  now = new Date().toISOString(),
): Promise<CaseEvidenceFile | null> {
  const query = db(client);
  const caseResult = await safeQuery("case", () =>
    query
      .from(TABLES.MERCHANT_CLAIMS)
      .select(
        "id,merchant_id,claim_type,reason_normalized,reason_raw,requested_action,status,amount_at_risk,currency,loss_attribution,responsibility_confirmation_state,responsibility_confirmed_at,responsibility_confirmed_by,responsibility_event_id,source_order_id,source_ticket_id,identity_id,created_at,updated_at",
      )
      .eq("merchant_id", merchantId)
      .eq("id", caseId)
      .maybeSingle(),
  );
  if (!caseResult.data) return caseResult.error ? null : null;
  const claim = record(caseResult.data);
  const reconciliationInputPromise = buildReconciliationInput(
    client,
    merchantId,
    caseId,
    now,
  ).catch(() => null);
  const sourceOrderPromise = claim.source_order_id
    ? safeQuery("order", () =>
        query
          .from(TABLES.SOURCE_ORDERS)
          .select(
            "id,external_id,order_number,customer_name,source_customer_id",
          )
          .eq("merchant_id", merchantId)
          .eq("id", claim.source_order_id)
          .maybeSingle(),
      )
    : Promise.resolve({ data: null, error: null });
  const ticketPromise = claim.source_ticket_id
    ? safeQuery("ticket", () =>
        query
          .from(TABLES.SOURCE_TICKETS)
          .select("id,external_id,subject")
          .eq("merchant_id", merchantId)
          .eq("id", claim.source_ticket_id)
          .maybeSingle(),
      )
    : Promise.resolve({ data: null, error: null });
  const [
    input,
    sourceOrder,
    ticket,
    evidenceResult,
    linksResult,
    snapshotsResult,
    financialResult,
    creditsResult,
    claimEventsResult,
    decisionsResult,
    actionRunsResult,
    outcomesResult,
  ] = await Promise.all([
    reconciliationInputPromise,
    sourceOrderPromise,
    ticketPromise,
    safeQuery("evidence", () =>
      query
        .from(TABLES.EVIDENCE_ITEMS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("claim_id", caseId)
        .order("occurred_at", { ascending: true, nullsFirst: false }),
    ),
    safeQuery("evidence links", () =>
      query
        .from(TABLES.EVIDENCE_LINKS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId),
    ),
    safeQuery("recommendations", () =>
      query
        .from(TABLES.CASE_RECOMMENDATION_SNAPSHOTS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("generated_at", { ascending: false }),
    ),
    safeQuery("financial entries", () =>
      query
        .from(TABLES.CASE_FINANCIAL_ENTRIES)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("effective_at", { ascending: false }),
    ),
    safeQuery("credits", () =>
      query
        .from(TABLES.PROVIDER_CREDIT_RECORDS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("occurred_at", { ascending: false }),
    ),
    safeQuery("claim activity", () =>
      query
        .from("claim_events")
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("claim_id", caseId)
        .order("created_at", { ascending: false }),
    ),
    safeQuery("merchant decisions", () =>
      query
        .from(TABLES.CASE_DECISIONS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("effective_at", { ascending: false }),
    ),
    safeQuery("external actions", () =>
      query
        .from(TABLES.CONNECTOR_ACTION_RUNS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("created_at", { ascending: false }),
    ),
    safeQuery("external outcomes", () =>
      query
        .from(TABLES.CASE_OUTCOME_EVENTS)
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("support_payout_case_id", caseId)
        .order("observed_at", { ascending: false }),
    ),
  ]);
  const errors = [
    caseResult.error,
    sourceOrder.error,
    ticket.error,
    evidenceResult.error,
    linksResult.error,
    snapshotsResult.error,
    financialResult.error,
    creditsResult.error,
    claimEventsResult.error,
    decisionsResult.error,
    actionRunsResult.error,
    outcomesResult.error,
  ].filter((value): value is string => Boolean(value));
  const evidenceRows = rows(evidenceResult.data);
  const linkByEvidence = new Map<string, Record<string, any>>();
  for (const link of rows(linksResult.data))
    if (
      link.evidence_item_id &&
      !linkByEvidence.has(String(link.evidence_item_id))
    )
      linkByEvidence.set(String(link.evidence_item_id), link);
  const evidence = evidenceRows.map((row) =>
    sourceRecord(row, linkByEvidence.get(String(row.id))),
  );
  const customerHistory = evidence.filter(
    (item) => item.sourceClass === "customer_history",
  );
  const sourceFacts: ReconciliationInput = input ?? {
    claimType: claim.reason_normalized ?? claim.claim_type ?? null,
    requestedAction: claim.requested_action ?? null,
    identityConfirmed: Boolean(claim.identity_id),
    orderConfirmed: Boolean(claim.source_order_id),
    claimedItems: [],
    parcels: [],
    facts: [],
    now,
  };
  const evaluation = evaluateReconciliation(sourceFacts);
  const latestResponsibility =
    rows(snapshotsResult.data).find(
      (row) => row.recommendation_type === "responsibility",
    ) ?? evaluation.recommendations.responsibility;
  const chain = buildCustodyChain(sourceFacts, evidence);
  const recoveryResult = await safeQuery("recovery case", () =>
    query
      .from(TABLES.RECOVERY_CASES)
      .select("*, partner:partners(*)")
      .eq("merchant_id", merchantId)
      .eq("support_payout_case_id", caseId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );
  const recoveryCase = recoveryResult.data
    ? await getRecoveryCaseForSupportPayoutCase(
        client,
        merchantId,
        caseId,
      ).catch(() => null)
    : null;
  let partnerRule: PartnerRecoveryRule | null = null;
  if (recoveryCase) {
    partnerRule = await findBestPartnerRecoveryRule(client, {
      merchantId,
      recoveryType: recoveryCase.recovery_type,
      claimType: claim.reason_normalized ?? claim.claim_type ?? "other",
      partnerId: recoveryCase.partner_id,
    }).catch(() => null);
  }
  const responsibility = apparentResponsibility(
    latestResponsibility ? record(latestResponsibility) : null,
    claim,
  );
  const providerClaimReadiness = buildReadiness(
    sourceFacts,
    evidence,
    chain,
    responsibility,
    recoveryCase,
    partnerRule,
    now,
  );
  const packResult = recoveryCase
    ? await safeQuery("claim packs", () =>
        query
          .from(TABLES.RECOVERY_CLAIM_PACKS)
          .select("*")
          .eq("merchant_id", merchantId)
          .eq("recovery_case_id", recoveryCase.id)
          .order("pack_version", { ascending: false }),
      )
    : { data: [], error: null };
  const submissionResult = recoveryCase
    ? await safeQuery("submissions", () =>
        query
          .from(TABLES.RECOVERY_CLAIM_SUBMISSIONS)
          .select("*")
          .eq("merchant_id", merchantId)
          .eq("recovery_case_id", recoveryCase.id)
          .order("submitted_at", { ascending: false }),
      )
    : { data: [], error: null };
  const responseResult = recoveryCase
    ? await safeQuery("provider responses", () =>
        query
          .from(TABLES.RECOVERY_PROVIDER_RESPONSES)
          .select("*")
          .eq("merchant_id", merchantId)
          .eq("recovery_case_id", recoveryCase.id)
          .order("received_at", { ascending: false }),
      )
    : { data: [], error: null };
  errors.push(
    ...[
      recoveryResult.error,
      packResult.error,
      submissionResult.error,
      responseResult.error,
    ].filter((value): value is string => Boolean(value)),
  );
  const recoveryEventsResult = recoveryCase
    ? await safeQuery("recovery activity", () =>
        query
          .from(TABLES.RECOVERY_CASE_EVENTS)
          .select("*")
          .eq("merchant_id", merchantId)
          .eq("recovery_case_id", recoveryCase.id)
          .order("created_at", { ascending: false }),
      )
    : { data: [], error: null };
  errors.push(
    ...[recoveryEventsResult.error].filter((value): value is string =>
      Boolean(value),
    ),
  );
  const decisions: CaseDecisionRecord[] = rows(decisionsResult.data).map(
    (row) => ({
      id: String(row.id),
      decision: String(row.decision ?? "unknown"),
      action: stringOrNull(row.action),
      amountMinor: numberOrNull(row.amount_minor),
      currency: stringOrNull(row.currency)?.toUpperCase() ?? null,
      reason: stringOrNull(row.reason),
      actorUserId: stringOrNull(row.actor_user_id),
      effectiveAt: stringOrNull(row.effective_at),
      recordedAt: stringOrNull(row.recorded_at),
      reversesDecisionId: stringOrNull(row.reverses_decision_id),
      supersedesDecisionId: stringOrNull(row.supersedes_decision_id),
    }),
  );
  const externalActions: CaseExternalActionRecord[] = rows(
    actionRunsResult.data,
  ).map((row) => ({
    id: String(row.id),
    capabilityId: String(row.capability_id ?? "unknown"),
    externalRecordId: String(row.external_record_id ?? "unknown"),
    status: String(row.status ?? "unknown"),
    payload: record(row.payload),
    result: record(row.result),
    actorUserId: stringOrNull(row.actor_user_id),
    createdAt: stringOrNull(row.created_at),
    completedAt: stringOrNull(row.completed_at),
  }));
  const outcomes: CaseOutcomeRecord[] = rows(outcomesResult.data).map((row) => ({
    id: String(row.id),
    outcomeType: String(row.outcome_type ?? "unknown"),
    state: String(row.state ?? "unknown"),
    sourceSystem: String(row.source_system ?? "unknown"),
    sourceRecordId: stringOrNull(row.source_record_id),
    sourceExternalId: stringOrNull(row.source_external_id),
    correlationMethod: stringOrNull(row.correlation_method),
    matchStatus: String(row.match_status ?? "unmatched"),
    amountMinor: numberOrNull(row.amount_minor),
    currency: stringOrNull(row.currency)?.toUpperCase() ?? null,
    actorUserId: stringOrNull(row.actor_user_id),
    observedAt: stringOrNull(row.observed_at),
    occurredAt: stringOrNull(row.occurred_at),
  }));
  const sourceActivities: CaseActivity[] = evidence.map((item) => ({
    id: `evidence:${item.id}`,
    occurredAt: item.eventAt ?? item.ingestedAt,
    kind: item.factKind === "human_finding" ? "finding" : "source",
    title: item.title,
    summary: item.summary,
    sourceId: item.id,
    sourceClass: item.sourceClass,
  }));
  const recommendationActivities: CaseActivity[] = rows(
    snapshotsResult.data,
  ).map((row) => ({
    id: `recommendation:${row.id}`,
    occurredAt: stringOrNull(row.generated_at),
    kind: "recommendation",
    title: String(row.headline ?? "Recommendation recorded"),
    summary: String(row.explanation ?? ""),
    sourceId: String(row.id),
    sourceClass: null,
  }));
  const decisionActivities: CaseActivity[] = decisions.map((decision) => ({
    id: `decision:${decision.id}`,
    occurredAt: decision.effectiveAt ?? decision.recordedAt,
    kind: "merchant_confirmation",
    title: decision.reversesDecisionId
      ? "Merchant decision correction recorded"
      : "Merchant decision recorded",
    summary: `${decision.decision.replaceAll("_", " ")}${
      decision.amountMinor != null && decision.currency
        ? ` · ${formatMinorCurrencyNullable(decision.amountMinor, decision.currency)}`
        : " · no financial amount"
    }. This is not an external provider result.`,
    sourceId: decision.id,
    sourceClass: null,
  }));
  const actionActivities: CaseActivity[] = externalActions.map((action) => ({
    id: `external-action:${action.id}`,
    occurredAt: action.createdAt,
    kind: "external_action",
    title:
      action.status === "manual_required"
        ? "External handoff prepared"
        : `External action ${action.status.replaceAll("_", " ")}`,
    summary:
      action.status === "manual_required"
        ? "Exact provider instructions were recorded. No provider action was performed by Unauth."
        : "The connector action state is recorded separately from the merchant decision and money outcome.",
    sourceId: action.id,
    sourceClass: null,
  }));
  const outcomeActivities: CaseActivity[] = outcomes.map((outcome) => ({
    id: `external-outcome:${outcome.id}`,
    occurredAt: outcome.occurredAt ?? outcome.observedAt,
    kind: "external_outcome",
    title: `External outcome: ${outcome.state.replaceAll("_", " ")}`,
    summary: `${outcome.outcomeType.replaceAll("_", " ")} · ${outcome.sourceSystem.replaceAll("_", " ")}. ${
      outcome.sourceExternalId
        ? `Reference ${outcome.sourceExternalId}.`
        : "No external reference recorded."
    }`,
    sourceId: outcome.id,
    sourceClass: null,
  }));
  const recoveryActivities: CaseActivity[] = rows(
    recoveryEventsResult.data,
  ).map((row) => ({
    id: `recovery:${row.id}`,
    occurredAt: stringOrNull(row.created_at),
    kind: "audit",
    title: String(row.event_type ?? "Recovery event"),
    summary: String(row.note ?? "Recovery event recorded."),
    sourceId: String(row.id),
    sourceClass: null,
  }));
  const claimActivities: CaseActivity[] = rows(claimEventsResult.data).map(
    (row) => ({
      id: `claim:${row.id}`,
      occurredAt: stringOrNull(row.created_at),
      kind: "audit",
      title: String(row.event_type ?? "Case event"),
      summary: String(record(row.metadata).summary ?? "Case event recorded."),
      sourceId: String(row.id),
      sourceClass: null,
    }),
  );
  const responseActivities: CaseActivity[] = rows(responseResult.data).map(
    (row) => ({
      id: `provider-response:${row.id}`,
      occurredAt: stringOrNull(row.received_at),
      kind: "provider_response",
      title: `Provider response: ${String(row.liability_position ?? "unknown")}`,
      summary: `Compensation state: ${String(row.compensation_state ?? "not_decided")}.`,
      sourceId: String(row.id),
      sourceClass: null,
    }),
  );
  const submissionActivities: CaseActivity[] = rows(submissionResult.data).map(
    (row) => ({
      id: `submission:${row.id}`,
      occurredAt: stringOrNull(row.submitted_at),
      kind: "submission",
      title: "Manual provider submission recorded",
      summary: String(
        row.external_claim_reference ?? "No provider reference recorded.",
      ),
      sourceId: String(row.id),
      sourceClass: null,
    }),
  );
  const creditActivities: CaseActivity[] = rows(creditsResult.data).map(
    (row) => ({
      id: `credit:${row.id}`,
      occurredAt: stringOrNull(row.occurred_at),
      kind: "credit",
      title: "Provider credit recorded",
      summary:
        `${String(row.amount_minor ?? "Unavailable")} ${String(row.currency ?? "")}`.trim(),
      sourceId: String(row.id),
      sourceClass: null,
    }),
  );
  const activity = [
    ...sourceActivities,
    ...recommendationActivities,
    ...decisionActivities,
    ...actionActivities,
    ...outcomeActivities,
    ...recoveryActivities,
    ...claimActivities,
    ...responseActivities,
    ...submissionActivities,
    ...creditActivities,
  ].sort((a, b) =>
    dateSort({ occurredAt: a.occurredAt }, { occurredAt: b.occurredAt }),
  );
  const firstFailureFact = [...sourceFacts.facts]
    .sort(
      (a, b) => Date.parse(a.occurredAt ?? "") - Date.parse(b.occurredAt ?? ""),
    )
    .find((fact) =>
      /loss|damage|exception|missing|short_pick|mispick|conflict/i.test(
        fact.evidenceType,
      ),
    );
  const sourceOrderRow = record(sourceOrder.data);
  const ticketRow = record(ticket.data);
  return {
    version: "case-evidence-file-v1",
    claim: {
      id: caseId,
      merchantId,
      claimType: stringOrNull(claim.claim_type),
      issueSummary:
        stringOrNull(
          claim.reason_raw ?? claim.reason_normalized ?? claim.claim_type,
        ) ?? "Customer issue summary unavailable.",
      requestedAction: stringOrNull(claim.requested_action),
      customerName: stringOrNull(sourceOrderRow.customer_name),
      orderId: stringOrNull(claim.source_order_id),
      orderReference: stringOrNull(
        sourceOrderRow.order_number ?? sourceOrderRow.external_id,
      ),
      ticketId: stringOrNull(claim.source_ticket_id),
      ticketReference: stringOrNull(ticketRow.external_id),
      amountAtRiskMinor: majorAmountToMinor(claim.amount_at_risk, claim.currency),
      currency: stringOrNull(claim.currency)?.toUpperCase() ?? null,
      status: String(claim.status ?? "unknown"),
      createdAt: stringOrNull(claim.created_at),
      updatedAt: stringOrNull(claim.updated_at),
    },
    evidence,
    customerHistory,
    custodyChain: chain,
    firstEvidencedFailure: {
      stage: firstFailureFact?.evidenceType ?? null,
      occurredAt: firstFailureFact?.occurredAt ?? null,
      summary: firstFailureFact?.summary ?? null,
      evidenceIds: firstFailureFact ? [firstFailureFact.id] : [],
    },
    itemParcelMatrix: evaluation.matrix,
    apparentResponsibility: responsibility,
    responsibilityRecommendation: latestResponsibility
      ? record(latestResponsibility)
      : (evaluation.recommendations.responsibility as unknown as Record<
          string,
          unknown
        >),
    providerClaimReadiness,
    partnerRule,
    recoveryCase,
    claimPacks: rows(packResult.data) as RecoveryClaimPack[],
    submissions: rows(submissionResult.data) as RecoveryClaimSubmission[],
    providerResponses: rows(responseResult.data) as RecoveryProviderResponse[],
    credits: rows(creditsResult.data),
    financialEntries: rows(financialResult.data),
    decisions,
    externalActions,
    outcomes,
    activity,
    availability: {
      case: "available",
      evidence: evidenceResult.error ? "unavailable" : "available",
      recovery:
        !recoveryCase && !recoveryResult.error
          ? "not_opened"
          : recoveryResult.error
            ? "unavailable"
            : "available",
      rule: partnerRule
        ? "available"
        : recoveryCase
          ? "not_confirmed"
          : "not_confirmed",
      errors: [...new Set(errors)],
    },
  };
}

export function claimPackSourcesFromCaseFile(file: CaseEvidenceFile) {
  return file.evidence.map(packSource);
}
