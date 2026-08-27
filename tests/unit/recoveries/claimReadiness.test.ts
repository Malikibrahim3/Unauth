import { evaluateProviderClaimReadiness } from "@/lib/recoveries/claimReadiness";

const allMetInput = () => ({
  now: "2026-08-22T12:00:00.000Z",
  ruleVersionId: "11111111-1111-4111-8111-111111111111",
  ruleConfirmed: true,
  claimantAuthority: { present: true, evidenceIds: ["authority"] },
  shipmentIdentity: { present: true, evidenceIds: ["shipment"] },
  custodyEstablished: { present: true, evidenceIds: ["handoff"] },
  coveredEvent: { present: true, evidenceIds: ["loss"] },
  deadlineOpen: { present: true, evidenceIds: ["terms"] },
  issueEvidence: { present: true, evidenceIds: ["issue"] },
  valueSubstantiated: { present: true, evidenceIds: ["value"] },
  amountBounded: { present: true, evidenceIds: ["value"] },
  exclusionsAndPreservation: { present: true, evidenceIds: ["manifest"] },
  responsibilityAssessment: "likely",
});

const allMet = () => evaluateProviderClaimReadiness(allMetInput());

describe("provider claim readiness", () => {
  it("requires every hard gate and returns a posture without making a payment promise", () => {
    const result = allMet();
    expect(result.readiness).toBe("ready_to_submit");
    expect(result.posture).toBe("strong");
    expect(result.gates).toHaveLength(9);
    expect(result.hardGateIds).toEqual([]);
  });

  it("does not allow generic or unconfirmed terms to make a claim ready", () => {
    const result = evaluateProviderClaimReadiness({
      ...allMetInput(),
      ruleVersionId: null,
      ruleConfirmed: false,
    });
    expect(result.readiness).toBe("not_assessable");
    expect(result.posture).toBe("not_assessable");
  });

  it("distinguishes expired and conflicting hard gates", () => {
    const expired = evaluateProviderClaimReadiness({
      ...allMetInput(),
      deadlineOpen: { expired: true, reason: "The deadline passed." },
    });
    expect(expired.readiness).toBe("not_eligible");
    expect(
      expired.gates.find((gate) => gate.id === "deadline_open")?.state,
    ).toBe("expired");

    const conflicting = evaluateProviderClaimReadiness({
      ...allMetInput(),
      custodyEstablished: { conflicting: true, evidenceIds: ["a", "b"] },
    });
    expect(conflicting.readiness).toBe("needs_review");
    expect(conflicting.posture).toBe("contestable");
  });

  it("keeps missing evidence explicit rather than treating it as zero or false success", () => {
    const result = evaluateProviderClaimReadiness({
      ...allMetInput(),
      valueSubstantiated: { unavailable: true },
      amountBounded: { present: false },
    });
    expect(result.readiness).toBe("evidence_needed");
    expect(result.missingEvidence).toEqual(
      expect.arrayContaining([
        expect.stringContaining("claimed item value"),
        expect.stringContaining("claim amount"),
      ]),
    );
  });

  it("does not treat an unconfirmed rule version as a confirmed basis", () => {
    const result = evaluateProviderClaimReadiness({
      ...allMetInput(),
      ruleConfirmed: undefined,
    });
    expect(result.readiness).toBe("not_assessable");
    expect(result.posture).toBe("not_assessable");
  });
});
