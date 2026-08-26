"use client";

import { useMemo, useState } from "react";
import { BeforeYouConfirm, Button, Drawer, Modal } from "@/components/ui";
import type {
  CaseEvidenceFile,
  CaseEvidenceRecord,
  CustodyChainEvent,
} from "@/lib/claims/caseEvidenceFile";
import {
  postureLabel,
  readinessLabel,
  type ClaimGate,
} from "@/lib/recoveries/claimReadiness";
import type { RecoveryCase } from "@/lib/recoveries/types";
import { parseMajorUnitInput } from "@/lib/ui/merchantCopy";
import { formatMinorCurrencyNullable } from "@/lib/utils/format";
import { formatDateTime } from "@/lib/utils/format";
import styles from "./CaseFileSections.module.css";

function stateLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(value: string | null): string {
  return value ? stateLabel(value) : "Source class unavailable";
}

export function CaseTruthStrip({ file }: { file: CaseEvidenceFile }) {
  const responsibility = file.apparentResponsibility;
  const readiness = file.providerClaimReadiness;
  const latestResponse = file.providerResponses[0];
  const credit = file.credits[0];
  const providerEvidenceCount = file.evidence.filter(
    (item) => item.sourceClass !== "customer_history",
  ).length;
  const lanes = [
    {
      id: "customer",
      label: "Customer request",
      value: file.claim.requestedAction
        ? stateLabel(file.claim.requestedAction)
        : "Request recorded",
      detail: file.claim.issueSummary,
      tone: "neutral",
    },
    {
      id: "evidence",
      label: "Source evidence",
      value: providerEvidenceCount
        ? `${providerEvidenceCount} records`
        : "Unavailable",
      detail:
        file.firstEvidencedFailure.summary ??
        "First evidenced failure not established.",
      tone: providerEvidenceCount ? "evidence" : "warning",
    },
    {
      id: "responsibility",
      label: "Apparent responsibility",
      value:
        responsibility.owner === "none_established"
          ? "No loss established"
          : stateLabel(responsibility.owner),
      detail: `${stateLabel(responsibility.confidence)} · merchant confirmation remains separate`,
      tone: responsibility.confidence === "known" ? "positive" : "warning",
    },
    {
      id: "provider",
      label: "Provider / money",
      value: latestResponse
        ? stateLabel(latestResponse.liability_position)
        : file.recoveryCase
          ? readinessLabel(readiness.readiness)
          : "Not opened",
      detail: latestResponse
        ? `${stateLabel(latestResponse.compensation_state)} · credit ${credit ? "recorded" : "not recorded"}`
        : readiness.nextAction,
      tone: latestResponse ? "positive" : "neutral",
    },
  ] as const;
  return (
    <section className={styles.truthStrip} aria-label="Case truth lanes">
      {lanes.map((lane) => (
        <div className={styles.truthLane} data-tone={lane.tone} key={lane.id}>
          <span>{lane.label}</span>
          <strong>{lane.value}</strong>
          <small>{lane.detail}</small>
        </div>
      ))}
    </section>
  );
}

function GateState({ gate }: { gate: ClaimGate }) {
  return (
    <span className={styles.gateState} data-state={gate.state}>
      {stateLabel(gate.state)}
    </span>
  );
}

export function ClaimGates({ file }: { file: CaseEvidenceFile }) {
  return (
    <section className={styles.card} aria-labelledby="claim-gates-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="claim-gates-heading">Nine hard claim gates</h2>
        </div>
        <span
          className={styles.posture}
          data-posture={file.providerClaimReadiness.posture}
        >
          {postureLabel(file.providerClaimReadiness.posture)}
        </span>
      </div>
      <p className={styles.explainer}>
        All gates must be met before a final provider pack can be frozen. This
        posture never promises provider acceptance or payment.
      </p>
      <div className={styles.gateGrid}>
        {file.providerClaimReadiness.gates.map((gate) => (
          <article className={styles.gate} key={gate.id}>
            <div className={styles.gateTop}>
              <strong>{gate.headline}</strong>
              <GateState gate={gate} />
            </div>
            <p>{gate.reason}</p>
            <small>
              {gate.evidenceIds.length
                ? `${gate.evidenceIds.length} cited source${gate.evidenceIds.length === 1 ? "" : "s"}`
                : "No cited source"}
            </small>
            {gate.state !== "met" && gate.state !== "not_applicable" ? (
              <div className={styles.nextAction}>{gate.nextAction}</div>
            ) : null}
          </article>
        ))}
      </div>
      <div className={styles.nextActionBar}>
        <strong>Next action</strong>
        <span>{file.providerClaimReadiness.nextAction}</span>
      </div>
    </section>
  );
}

export function CustodyChainCard({
  chain,
  firstFailure,
}: {
  chain: CustodyChainEvent[];
  firstFailure: CaseEvidenceFile["firstEvidencedFailure"];
}) {
  return (
    <section className={styles.card} aria-labelledby="custody-chain-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="custody-chain-heading">Custody chain</h2>
        </div>
        <span className={styles.mutedLabel}>
          Last correct → first evidenced failure
        </span>
      </div>
      <div className={styles.chain}>
        {chain.map((event, index) => (
          <div
            className={styles.chainEvent}
            data-state={event.state}
            key={event.id}
          >
            <span className={styles.chainIndex}>{index + 1}</span>
            <div>
              <strong>{event.label}</strong>
              <small>
                {event.occurredAt
                  ? formatDateTime(event.occurredAt)
                  : "Date unavailable"}
              </small>
              <p>{event.summary}</p>
              <span className={styles.gateState} data-state={event.state}>
                {stateLabel(event.state)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.failureCallout}>
        <span>First evidenced failure</span>
        <strong>
          {firstFailure.stage
            ? stateLabel(firstFailure.stage)
            : "Not established"}
        </strong>
        <p>
          {firstFailure.summary ??
            "No source event currently establishes where the chain first failed."}
        </p>
      </div>
    </section>
  );
}

export function ItemParcelMatrixCard({ file }: { file: CaseEvidenceFile }) {
  return (
    <section className={styles.card} aria-labelledby="item-parcel-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="item-parcel-heading">Item → parcel matrix</h2>
        </div>
        <span className={styles.mutedLabel}>
          {file.itemParcelMatrix.length} reconciled row
          {file.itemParcelMatrix.length === 1 ? "" : "s"}
        </span>
      </div>
      {file.itemParcelMatrix.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Parcel</th>
                <th>Recorded</th>
                <th>State</th>
                <th>Physical proof</th>
                <th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {file.itemParcelMatrix.map((row) => (
                <tr key={`${row.claimedItemId}-${row.parcelId ?? "unmatched"}`}>
                  <td>
                    <strong>{row.claimedSku ?? row.claimedItemId}</strong>
                    <small>{row.claimedQuantity} claimed</small>
                  </td>
                  <td>{row.parcelId ?? "Not recorded"}</td>
                  <td>{row.recordedQuantity}</td>
                  <td>
                    <span
                      className={styles.gateState}
                      data-state={
                        row.state === "delivered"
                          ? "conflicting"
                          : row.state === "in_transit"
                            ? "unavailable"
                            : row.state === "exception"
                              ? "conflicting"
                              : row.state === "not_recorded"
                                ? "missing"
                                : "met"
                      }
                    >
                      {stateLabel(row.state)}
                    </span>
                  </td>
                  <td>{row.physicalProof ? "Present" : "Not present"}</td>
                  <td>
                    {row.missingEvidence.length
                      ? row.missingEvidence.join(", ")
                      : "None recorded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>
          No claimed item or parcel rows are available.
        </p>
      )}
    </section>
  );
}

export function EvidenceRegisterCard({ file }: { file: CaseEvidenceFile }) {
  const [selected, setSelected] = useState<CaseEvidenceRecord | null>(null);
  const ordered = useMemo(
    () =>
      file.evidence
        .filter((item) => item.sourceClass !== "customer_history")
        .sort(
          (a, b) =>
            Date.parse(b.eventAt ?? b.ingestedAt ?? "") -
            Date.parse(a.eventAt ?? a.ingestedAt ?? ""),
        ),
    [file.evidence],
  );
  return (
    <section
      className={styles.card}
      aria-labelledby="evidence-register-heading"
    >
      <div className={styles.cardHeader}>
        <div>
          <h2 id="evidence-register-heading">Evidence register</h2>
        </div>
        <span className={styles.mutedLabel}>
          {ordered.length} provider-eligible case record
          {ordered.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className={styles.register}>
        {ordered.length ? (
          ordered.map((item) => (
            <button
              className={styles.registerRow}
              type="button"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <span
                className={styles.registerMarker}
                data-state={item.freshness}
              >
                {item.factKind === "source_fact"
                  ? "S"
                  : item.factKind === "human_finding"
                    ? "H"
                    : "I"}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {sourceLabel(item.sourceClass)} · {item.system} ·{" "}
                  {item.eventAt
                    ? formatDateTime(item.eventAt)
                    : "Event time unavailable"}
                </small>
              </span>
              <span className={styles.registerRight}>
                <em>{stateLabel(item.freshness)}</em>
                <small>
                  {item.contentHash
                    ? `hash ${item.contentHash.slice(0, 10)}`
                    : "Hash unavailable"}
                </small>
              </span>
            </button>
          ))
        ) : (
          <p className={styles.empty}>
            Source evidence is unavailable for this case.
          </p>
        )}
      </div>
      {file.customerHistory.length ? (
        <div className={styles.historyNote}>
          <strong>Customer history is separate</strong>
          <span>
            {file.customerHistory.length} context record
            {file.customerHistory.length === 1 ? "" : "s"} retained for review;
            none are included in provider packs.
          </span>
        </div>
      ) : null}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Evidence record"
        width={520}
        overlayId="case-evidence-record-drawer"
      >
        <EvidenceDrawerBody item={selected} />
      </Drawer>
    </section>
  );
}

function EvidenceDrawerBody({ item }: { item: CaseEvidenceRecord | null }) {
  if (!item) return null;
  return (
    <div className={styles.drawerBody}>
      <div className={styles.drawerTitle}>
        <span className={styles.registerMarker}>
          {item.factKind === "source_fact"
            ? "S"
            : item.factKind === "human_finding"
              ? "H"
              : "I"}
        </span>
        <div>
          <strong>{item.title}</strong>
          <small>
            {sourceLabel(item.sourceClass)} · {item.system}
          </small>
        </div>
      </div>
      <dl className={styles.metadata}>
        <div>
          <dt>Evidence type</dt>
          <dd>{stateLabel(item.evidenceType)}</dd>
        </div>
        <div>
          <dt>Fact kind</dt>
          <dd>{stateLabel(item.factKind)}</dd>
        </div>
        <div>
          <dt>Source record</dt>
          <dd>{item.sourceRecordId ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Original access</dt>
          <dd>
            {item.originalUrl ? (
              <a href={item.originalUrl} target="_blank" rel="noreferrer">
                Open source record
              </a>
            ) : (
              (item.storagePath ?? "Unavailable")
            )}
          </dd>
        </div>
        <div>
          <dt>Lineage root</dt>
          <dd>{item.lineageRootId}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>{stateLabel(item.freshness)}</dd>
        </div>
        <div>
          <dt>Observed</dt>
          <dd>{item.eventAt ? formatDateTime(item.eventAt) : "Unavailable"}</dd>
        </div>
        <div>
          <dt>Ingested</dt>
          <dd>
            {item.ingestedAt ? formatDateTime(item.ingestedAt) : "Unavailable"}
          </dd>
        </div>
      </dl>
      <p className={styles.drawerSummary}>{item.summary}</p>
      {item.supports.length ? (
        <div className={styles.miniList}>
          <strong>Supports</strong>
          <span>{item.supports.join(", ")}</span>
        </div>
      ) : null}
      {item.conflicts.length ? (
        <div className={styles.miniList} data-tone="warning">
          <strong>Conflicts</strong>
          <span>{item.conflicts.join(", ")}</span>
        </div>
      ) : null}
    </div>
  );
}

export function ResponsibilityCard({
  file,
  onConfirm,
}: {
  file: CaseEvidenceFile;
  onConfirm: () => void;
}) {
  const responsibility = file.apparentResponsibility;
  return (
    <section className={styles.card} aria-labelledby="responsibility-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="responsibility-heading">Apparent responsibility</h2>
        </div>
        <span
          className={styles.posture}
          data-posture={responsibility.confidence}
        >
          {stateLabel(responsibility.confidence)}
        </span>
      </div>
      <h3>{responsibility.headline}</h3>
      <p className={styles.explainer}>{responsibility.explanation}</p>
      <div className={styles.evidenceColumns}>
        <div>
          <strong>Supporting</strong>
          {responsibility.supportingEvidenceIds.length ? (
            <ul>
              {responsibility.supportingEvidenceIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          ) : (
            <span>None cited</span>
          )}
        </div>
        <div>
          <strong>Conflicting</strong>
          {responsibility.conflictingEvidenceIds.length ? (
            <ul>
              {responsibility.conflictingEvidenceIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          ) : (
            <span>None cited</span>
          )}
        </div>
        <div>
          <strong>Missing</strong>
          {responsibility.missingEvidence.length ? (
            <ul>
              {responsibility.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <span>None recorded</span>
          )}
        </div>
      </div>
      <div className={styles.confirmBoundary}>
        <div>
          <strong>
            {responsibility.merchantConfirmed
              ? "Merchant confirmation recorded"
              : "Merchant confirmation not recorded"}
          </strong>
          <small>
            {responsibility.confirmationSource ??
              "Recommendation is not a merchant decision."}
          </small>
        </div>
        <Button size="sm" variant="secondary" onClick={onConfirm}>
          {responsibility.merchantConfirmed
            ? "Review correction"
            : "Review confirmation"}
        </Button>
      </div>
    </section>
  );
}

function currencyAmount(
  recoveryCase: RecoveryCase | null,
  minor: number | null | undefined,
) {
  return minor == null
    ? "Unavailable"
    : formatMinorCurrencyNullable(minor, recoveryCase?.currency ?? null);
}

export function RecoveryOutcomeCard({
  file,
  canManage = false,
  onRefresh,
}: {
  file: CaseEvidenceFile;
  canManage?: boolean;
  onRefresh: () => void;
}) {
  const [packModal, setPackModal] = useState<"draft" | "final" | null>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recoveryCase = file.recoveryCase;
  const [submissionRef, setSubmissionRef] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [responsePosition, setResponsePosition] = useState("accepted");
  const [compensationState, setCompensationState] = useState("approved");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [creditedAmount, setCreditedAmount] = useState("");
  if (!recoveryCase)
    return (
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Recovery not opened</h2>
          </div>
        </div>
        <p className={styles.empty}>
          No provider recovery case is linked. This is separate from the
          customer decision.
        </p>
      </section>
    );
  const latestPack = file.claimPacks[0];
  const latestSubmission = file.submissions[0];
  const latestResponse = file.providerResponses[0];
  async function post(
    path: string,
    body: Record<string, unknown>,
  ) {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${path}:${Date.now()}`,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error ?? "Recovery action failed.");
      setPackModal(null);
      setSubmissionOpen(false);
      setResponseOpen(false);
      onRefresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Recovery action failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const canFinalize =
    file.providerClaimReadiness.readiness === "ready_to_submit";
  return (
    <section className={styles.card} aria-labelledby="recovery-heading">
      <div className={styles.cardHeader}>
        <div>
          <h2 id="recovery-heading">External claim and money outcome</h2>
        </div>
        <span
          className={styles.posture}
          data-posture={file.providerClaimReadiness.posture}
        >
          {readinessLabel(file.providerClaimReadiness.readiness)}
        </span>
      </div>
      <div className={styles.recoveryGrid}>
        <div>
          <span>Provider</span>
          <strong>
            {recoveryCase.partner?.name ?? stateLabel(recoveryCase.owner_type)}
          </strong>
          <small>
            {recoveryCase.deadline_at
              ? `Deadline ${formatDateTime(recoveryCase.deadline_at)}`
              : "Deadline unavailable"}
          </small>
        </div>
        <div>
          <span>Amount sought</span>
          <strong>
            {currencyAmount(recoveryCase, recoveryCase.amount_sought_minor)}
          </strong>
          <small>{recoveryCase.currency}</small>
        </div>
        <div>
          <span>Provider position</span>
          <strong>
            {latestResponse
              ? stateLabel(latestResponse.liability_position)
              : "Not recorded"}
          </strong>
          <small>
            {latestResponse
              ? stateLabel(latestResponse.compensation_state)
              : "No external response recorded"}
          </small>
        </div>
        <div>
          <span>Credit / reconciliation</span>
          <strong>
            {file.credits.length ? "Credit recorded" : "Not recorded"}
          </strong>
          <small>
            {file.financialEntries.length
              ? "Ledger entry present"
              : "Ledger match unavailable"}
          </small>
        </div>
      </div>
      <div className={styles.actionRow}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPackModal("draft")}
          disabled={busy || !canManage}
        >
          Build draft pack
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setPackModal("final")}
          disabled={busy || !canManage || !canFinalize}
        >
          Finalize pack
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSubmissionOpen(true)}
          disabled={busy || !canManage || !latestPack || latestPack.state !== "final"}
        >
          Record submission
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setResponseOpen(true)}
          disabled={busy || !canManage || !latestSubmission}
        >
          Record response
        </Button>
      </div>
      <div className={styles.outcomeRows}>
        {latestPack ? (
          <div>
            <span>Latest pack</span>
            <strong>
              {latestPack.state} · v{latestPack.pack_version}
            </strong>
            <small>
              {latestPack.pdf_hash
                ? `PDF ${latestPack.pdf_hash.slice(0, 12)}`
                : "Artifact hash unavailable"}
            </small>
          </div>
        ) : null}
        {latestSubmission ? (
          <div>
            <span>Submission</span>
            <strong>
              {latestSubmission.external_claim_reference ??
                "Reference unavailable"}
            </strong>
            <small>{formatDateTime(latestSubmission.submitted_at)}</small>
          </div>
        ) : null}
        {latestResponse ? (
          <div>
            <span>Provider response</span>
            <strong>
              {latestResponse.external_reference ?? "Reference unavailable"}
            </strong>
            <small>{formatDateTime(latestResponse.received_at)}</small>
          </div>
        ) : null}
      </div>
      {latestPack ? (
        <div className={styles.artifactLinks} aria-label="Claim pack downloads">
          <span>Export frozen artifacts</span>
          <a href={`/api/recoveries/${recoveryCase.id}/claim-packs/${latestPack.id}?format=pdf`}>PDF</a>
          <a href={`/api/recoveries/${recoveryCase.id}/claim-packs/${latestPack.id}?format=zip`}>ZIP + manifest</a>
        </div>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Modal
        open={packModal != null}
        onClose={() => setPackModal(null)}
        title={
          packModal === "final"
            ? "Finalize provider claim pack"
            : "Build draft provider claim pack"
        }
        overlayId="claim-pack-confirm"
        actions={[
          {
            label: packModal === "final" ? "Finalize pack" : "Build draft",
            variant: "primary",
            disabled: busy || !canManage || (packModal === "final" && !canFinalize),
            onClick: () =>
              void post(`/api/recoveries/${recoveryCase.id}/claim-packs`, {
                finalize: packModal === "final",
              }),
          },
        ]}
      >
        <BeforeYouConfirm
          objectSummary={`Case ${file.claim.id} · ${recoveryCase.partner?.name ?? recoveryCase.owner_type}`}
          valueSummary={currencyAmount(
            recoveryCase,
            recoveryCase.amount_sought_minor,
          )}
          externalAction="Creates an immutable internal pack artifact. It does not contact the provider."
          reversible="A draft can be superseded; a final manifest is append-only."
          appendOnly="Pack manifest, source hashes, and audit record."
        />
        {packModal === "final" && !canFinalize ? (
          <p className={styles.error}>
            Finalization is blocked until all nine hard gates are met.
          </p>
        ) : (
          <p className={styles.explainer}>
            {packModal === "final"
              ? "The manifest will be frozen for manual merchant submission."
              : "The pack will be watermarked Draft — evidence incomplete when any gate is unresolved."}
          </p>
        )}
      </Modal>
      {submissionOpen ? (
        <Modal
          open
          onClose={() => setSubmissionOpen(false)}
          title="Record manual provider submission"
          overlayId="submission-confirm"
        >
          <SubmissionForm
            reference={submissionRef}
            setReference={setSubmissionRef}
            url={submissionUrl}
            setUrl={setSubmissionUrl}
            onSubmit={() =>
              post(`/api/recoveries/${recoveryCase.id}/submissions`, {
                channel: "manual_portal",
                claim_pack_id: latestPack?.id,
                external_claim_reference: submissionRef || null,
                external_url: submissionUrl || null,
              })
            }
            busy={busy}
          />
        </Modal>
      ) : null}
      {responseOpen ? (
        <Modal
          open
          onClose={() => setResponseOpen(false)}
          title="Record provider response"
          overlayId="response-confirm"
        >
          <ResponseForm
            currency={recoveryCase.currency}
            position={responsePosition}
            setPosition={setResponsePosition}
            compensation={compensationState}
            setCompensation={setCompensationState}
            approved={approvedAmount}
            setApproved={setApprovedAmount}
            credited={creditedAmount}
            setCredited={setCreditedAmount}
            onSubmit={() =>
              post(`/api/recoveries/${recoveryCase.id}/provider-responses`, {
                provider: recoveryCase.partner?.name ?? recoveryCase.owner_type,
                liability_position: responsePosition,
                compensation_state: compensationState,
                approved_amount_minor: approvedAmount
                  ? parseMajorUnitInput(approvedAmount, recoveryCase.currency)
                  : null,
                credited_amount_minor: creditedAmount
                  ? parseMajorUnitInput(creditedAmount, recoveryCase.currency)
                  : null,
                currency: recoveryCase.currency,
                submission_id: latestSubmission?.id ?? null,
              })
            }
            busy={busy}
          />
        </Modal>
      ) : null}
    </section>
  );
}

function SubmissionForm({
  reference,
  setReference,
  url,
  setUrl,
  onSubmit,
  busy,
}: {
  reference: string;
  setReference: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className={styles.form}>
      <label>
        Provider reference
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Claim or ticket reference"
        />
      </label>
      <label>
        Provider URL
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
        />
      </label>
      <BeforeYouConfirm
        objectSummary="This recovery case and its final pack"
        valueSummary="Recorded claim amount from the frozen pack"
        externalAction="Records a manual submission receipt only; no provider API or email is called."
        reversible="The receipt is append-only; corrections are new records."
        appendOnly="Submission reference, channel, timestamp, and actor."
      />
      <Button
        variant="primary"
        onClick={onSubmit}
        disabled={busy || (!reference.trim() && !url.trim())}
      >
        Record submission
      </Button>
    </div>
  );
}

function ResponseForm({
  currency,
  position,
  setPosition,
  compensation,
  setCompensation,
  approved,
  setApproved,
  credited,
  setCredited,
  onSubmit,
  busy,
}: {
  currency: string;
  position: string;
  setPosition: (value: string) => void;
  compensation: string;
  setCompensation: (value: string) => void;
  approved: string;
  setApproved: (value: string) => void;
  credited: string;
  setCredited: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const approvedMinor = approved ? parseMajorUnitInput(approved, currency) : null;
  const creditedMinor = credited ? parseMajorUnitInput(credited, currency) : null;
  const amountInvalid =
    (approved.length > 0 && (approvedMinor == null || approvedMinor < 0)) ||
    (credited.length > 0 && (creditedMinor == null || creditedMinor < 0)) ||
    (approvedMinor != null && creditedMinor != null && creditedMinor > approvedMinor);

  return (
    <div className={styles.form}>
      <label>
        Provider position
        <select
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        >
          <option value="accepted">Accepted</option>
          <option value="partially_accepted">Partially accepted</option>
          <option value="denied">Denied</option>
          <option value="no_admission">No admission</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>
      <label>
        Compensation state
        <select
          value={compensation}
          onChange={(event) => setCompensation(event.target.value)}
        >
          <option value="approved">Approved</option>
          <option value="partially_approved">Partially approved</option>
          <option value="credited">Credited</option>
          <option value="reconciled">Reconciled</option>
          <option value="denied">Denied</option>
          <option value="written_off">Written off</option>
        </select>
      </label>
      <label>
        Approved amount ({currency})
        <input
          inputMode="decimal"
          value={approved}
          onChange={(event) => setApproved(event.target.value)}
          placeholder="0.00"
        />
      </label>
      <label>
        Credited amount ({currency})
        <input
          inputMode="decimal"
          value={credited}
          onChange={(event) => setCredited(event.target.value)}
          placeholder="0.00"
        />
      </label>
      <BeforeYouConfirm
        objectSummary="This recovery case and its submission"
        valueSummary={`Approved ${approved || "unrecorded"} · credited ${credited || "unrecorded"}`}
        externalAction="Records a manual provider response; no provider API or writeback is called."
        reversible="The response is append-only; a correction is a new response."
        appendOnly="Provider position, compensation state, amount, timestamp, and actor."
      />
      {amountInvalid ? (
        <p className={styles.error} role="alert">
          Enter valid non-negative {currency} amounts; credited value cannot exceed approved value.
        </p>
      ) : null}
      <Button variant="primary" onClick={onSubmit} disabled={busy || amountInvalid}>
        Record provider response
      </Button>
    </div>
  );
}

export function ActivityTimeline({ file }: { file: CaseEvidenceFile }) {
  return (
    <section className={styles.card} aria-labelledby="activity-heading">
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.eyebrow}>Audit trace</span>
          <h2 id="activity-heading">Combined case activity</h2>
        </div>
        <span className={styles.mutedLabel}>{file.activity.length} events</span>
      </div>
      {file.activity.length ? (
        <ol className={styles.activity}>
          {file.activity.map((event) => (
            <li key={event.id}>
              <span className={styles.activityDot} data-kind={event.kind} />
              <div>
                <div className={styles.activityTop}>
                  <strong>{event.title}</strong>
                  <time>
                    {event.occurredAt
                      ? formatDateTime(event.occurredAt)
                      : "Time unavailable"}
                  </time>
                </div>
                <p>{event.summary}</p>
                {event.sourceClass ? (
                  <small>
                    {sourceLabel(event.sourceClass)} · {event.sourceId}
                  </small>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>No case activity has been recorded.</p>
      )}
    </section>
  );
}

export function CaseFileUnavailable({ message }: { message: string }) {
  return (
    <section className={styles.card}>
      <div className={styles.emptyState}>
        <strong>Case evidence file unavailable</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}
