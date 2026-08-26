import type { CaseSourceClass } from "@/lib/evidence/sourceClasses";

export const CLAIM_GATE_IDS = [
  "claimant_authority",
  "shipment_identity",
  "custody_established",
  "covered_event",
  "deadline_open",
  "issue_evidence",
  "value_substantiated",
  "amount_bounded",
  "exclusions_and_preservation",
] as const;
export type ClaimGateId = (typeof CLAIM_GATE_IDS)[number];

export const CLAIM_GATE_STATES = [
  "met",
  "missing",
  "conflicting",
  "unavailable",
  "expired",
  "not_applicable",
] as const;
export type ClaimGateState = (typeof CLAIM_GATE_STATES)[number];

export const CLAIM_READINESS_STATES = [
  "not_assessable",
  "not_eligible",
  "evidence_needed",
  "needs_review",
  "ready_to_submit",
  "submitted",
  "waiting_on_provider",
  "provider_position_recorded",
  "credited_unreconciled",
  "reconciled",
] as const;
export type ClaimReadinessState = (typeof CLAIM_READINESS_STATES)[number];

export const CLAIM_POSTURES = [
  "strong",
  "contestable",
  "insufficient",
  "not_assessable",
] as const;
export type ClaimPosture = (typeof CLAIM_POSTURES)[number];

export type ClaimGate = {
  id: ClaimGateId;
  state: ClaimGateState;
  headline: string;
  reason: string;
  evidenceIds: string[];
  ruleVersionId: string | null;
  nextAction: string;
};

export type ClaimReadinessInput = {
  now?: string;
  ruleVersionId?: string | null;
  ruleConfirmed?: boolean;
  claimantAuthority?: GateInput;
  shipmentIdentity?: GateInput;
  custodyEstablished?: GateInput;
  coveredEvent?: GateInput;
  deadlineOpen?: GateInput;
  issueEvidence?: GateInput;
  valueSubstantiated?: GateInput;
  amountBounded?: GateInput;
  exclusionsAndPreservation?: GateInput;
  responsibilityAssessment?:
    "known" | "likely" | "unresolved" | "blocked" | "not_applicable";
  sourceClasses?: CaseSourceClass[];
};

export type GateInput = {
  state?: ClaimGateState;
  present?: boolean;
  conflicting?: boolean;
  unavailable?: boolean;
  expired?: boolean;
  notApplicable?: boolean;
  headline?: string;
  reason?: string;
  evidenceIds?: string[];
  nextAction?: string;
};

export type ProviderClaimReadiness = {
  readiness: ClaimReadinessState;
  posture: ClaimPosture;
  gates: ClaimGate[];
  hardGateIds: ClaimGateId[];
  missingEvidence: string[];
  nextAction: string;
  ruleVersionId: string | null;
  evaluatedAt: string;
};

const DEFAULT_GATE_COPY: Record<
  ClaimGateId,
  { headline: string; missing: string; nextAction: string }
> = {
  claimant_authority: {
    headline: "Merchant claimant authority",
    missing:
      "The merchant account or contract does not establish who may claim.",
    nextAction: "Confirm the merchant claimant and provider account.",
  },
  shipment_identity: {
    headline: "Shipment identity",
    missing:
      "Order, item, parcel, or tracking identity is not bound to one case.",
    nextAction: "Resolve the order, item, parcel, and tracking references.",
  },
  custody_established: {
    headline: "Custody chain established",
    missing:
      "The chain from instruction through delivery has a missing or conflicting handoff.",
    nextAction: "Collect the missing custody event or resolve the conflict.",
  },
  covered_event: {
    headline: "Covered event",
    missing:
      "The observed event is not mapped to a confirmed covered provider event.",
    nextAction: "Confirm the covered event under the approved rule.",
  },
  deadline_open: {
    headline: "Notice and claim deadlines",
    missing:
      "The provider deadline is unavailable or the required notice window is closed.",
    nextAction: "Confirm the applicable deadline basis and deadline.",
  },
  issue_evidence: {
    headline: "Issue evidence",
    missing:
      "The customer issue is not supported by permitted source evidence.",
    nextAction: "Collect or link the source evidence for the issue.",
  },
  value_substantiated: {
    headline: "Value substantiated",
    missing:
      "The claimed item value is not supported by an allowed source record.",
    nextAction:
      "Link the order line, invoice, or other permitted value record.",
  },
  amount_bounded: {
    headline: "Claim amount bounded",
    missing:
      "The claim amount is missing, mixed-currency, or outside the rule cap.",
    nextAction: "Bound the amount in one currency against the approved rule.",
  },
  exclusions_and_preservation: {
    headline: "Exclusions and preservation",
    missing:
      "Excluded costs or evidence-preservation requirements are unresolved.",
    nextAction: "Resolve exclusions and preserve the final source manifest.",
  },
};

function nowIso(value?: string): string {
  return value ?? new Date().toISOString();
}

function gateState(input: GateInput | undefined): ClaimGateState {
  if (input?.state) return input.state;
  if (input?.notApplicable) return "not_applicable";
  if (input?.expired) return "expired";
  if (input?.conflicting) return "conflicting";
  if (input?.unavailable) return "unavailable";
  if (input?.present) return "met";
  return "missing";
}

function makeGate(
  id: ClaimGateId,
  input: GateInput | undefined,
  ruleVersionId: string | null,
): ClaimGate {
  const copy = DEFAULT_GATE_COPY[id];
  const state = gateState(input);
  const evidenceIds = [...new Set((input?.evidenceIds ?? []).filter(Boolean))];
  const reason =
    input?.reason ??
    (state === "met"
      ? "The required evidence is present and internally consistent."
      : copy.missing);
  return {
    id,
    state,
    headline: input?.headline ?? copy.headline,
    reason,
    evidenceIds,
    ruleVersionId,
    nextAction:
      input?.nextAction ??
      (state === "met" || state === "not_applicable"
        ? "No action required."
        : copy.nextAction),
  };
}

/**
 * Evaluate all nine hard gates. This is deliberately boolean/state based: a
 * score or probability cannot make an external claim ready.
 */
export function evaluateProviderClaimReadiness(
  input: ClaimReadinessInput,
): ProviderClaimReadiness {
  const evaluatedAt = nowIso(input.now);
  const ruleVersionId = input.ruleVersionId ?? null;
  const gateInputs: Record<ClaimGateId, GateInput | undefined> = {
    claimant_authority: input.claimantAuthority,
    shipment_identity: input.shipmentIdentity,
    custody_established: input.custodyEstablished,
    covered_event: input.coveredEvent,
    deadline_open: input.deadlineOpen,
    issue_evidence: input.issueEvidence,
    value_substantiated: input.valueSubstantiated,
    amount_bounded: input.amountBounded,
    exclusions_and_preservation: input.exclusionsAndPreservation,
  };
  const gates = CLAIM_GATE_IDS.map((id) =>
    makeGate(id, gateInputs[id], ruleVersionId),
  );
  const hardGateIds = gates
    .filter((gate) => !["met", "not_applicable"].includes(gate.state))
    .map((gate) => gate.id);
  const missingEvidence = gates
    .filter((gate) => gate.state !== "met" && gate.state !== "not_applicable")
    .map((gate) => gate.reason);
  const hasUnassessableSubject = gates.some(
    (gate) =>
      gate.id === "shipment_identity" &&
      ["missing", "unavailable"].includes(gate.state),
  );
  const termsUnconfirmed = !input.ruleVersionId || input.ruleConfirmed !== true;
  const hasExpired = gates.some((gate) => gate.state === "expired");
  const hasConflict = gates.some((gate) => gate.state === "conflicting");
  const hasUnavailableOrMissing = gates.some((gate) =>
    ["missing", "unavailable"].includes(gate.state),
  );
  let readiness: ClaimReadinessState = "ready_to_submit";
  if (hasExpired) readiness = "not_eligible";
  else if (hasConflict) readiness = "needs_review";
  else if (termsUnconfirmed) readiness = "not_assessable";
  else if (hasUnassessableSubject) readiness = "evidence_needed";
  else if (hasUnavailableOrMissing) readiness = "evidence_needed";

  const responsibility = input.responsibilityAssessment;
  let posture: ClaimPosture = "strong";
  if (readiness === "not_assessable") posture = "not_assessable";
  else if (readiness !== "ready_to_submit")
    posture = hasConflict ? "contestable" : "insufficient";
  else if (
    responsibility === "unresolved" ||
    responsibility === "blocked" ||
    hasConflict
  )
    posture = "contestable";

  return {
    readiness,
    posture,
    gates,
    hardGateIds,
    missingEvidence,
    nextAction:
      gates.find((gate) => !["met", "not_applicable"].includes(gate.state))
        ?.nextAction ??
      "No further evidence action is required; manual submission remains a merchant action.",
    ruleVersionId,
    evaluatedAt,
  };
}

export function readinessLabel(value: ClaimReadinessState): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function postureLabel(value: ClaimPosture): string {
  return value === "not_assessable"
    ? "Not assessable"
    : value.charAt(0).toUpperCase() + value.slice(1);
}
