'use client';

import { CheckCircle2, Scale, ShieldAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { Bone, Button, Card, Modal, Select, StatusBadge } from '@/components/ui';
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from '@/lib/investigations/client';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  ATTRIBUTION_CONFIDENCE_LABELS,
  ATTRIBUTION_CONFIDENCES,
  LIKELY_OWNER_LABELS,
  LIKELY_OWNERS,
  LOSS_ATTRIBUTION_DISPLAY,
  LOSS_ATTRIBUTION_LABELS,
  RECOVERABILITIES,
  RECOVERABILITY_LABELS,
  type AttributionConfidence,
  type LikelyOwner,
  type LossAttributionLabel,
  type Recoverability,
} from '@/lib/payouts/types';
import { formatDateTime } from '@/lib/utils/format';

type ResponsibilityProjection = {
  state_version: number;
  loss_attribution: LossAttributionLabel | null;
  attribution_confidence: AttributionConfidence | null;
  recoverability: Recoverability | null;
  recovery_owner: LikelyOwner | null;
  responsibility_confirmation_state: 'unconfirmed' | 'confirmed' | 'corrected';
  responsibility_confirmed_at: string | null;
  responsibility_confirmed_by: string | null;
  responsibility_event_id: string | null;
};

type EvidenceOption = {
  id: string;
  evidence_type: string;
  title: string | null;
  summary: string | null;
  source_system: string;
  occurred_at: string | null;
  created_at: string;
};

type ResponsibilityPayload = {
  responsibility: ResponsibilityProjection | null;
  evidence_options: EvidenceOption[];
  permissions: { can_mutate: boolean };
};

function ResponsibilityDialog({
  caseId,
  projection,
  evidence,
  onClose,
  onSaved,
}: {
  caseId: string;
  projection: ResponsibilityProjection;
  evidence: EvidenceOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [attribution, setAttribution] = useState<LossAttributionLabel>(
    projection.loss_attribution ?? 'unknown',
  );
  const [confidence, setConfidence] = useState<AttributionConfidence>(
    projection.attribution_confidence ?? 'needs_more_evidence',
  );
  const [owner, setOwner] = useState<LikelyOwner>(
    projection.recovery_owner ?? 'unknown',
  );
  const [recoverability, setRecoverability] = useState<Recoverability>(
    projection.recoverability ?? 'unknown',
  );
  const [evidenceRole, setEvidenceRole] = useState<Record<string, 'none' | 'supporting' | 'conflicting'>>({});
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(
    newInvestigationIdempotencyKey(`case-responsibility:${caseId}`),
  );

  const differs = (
    attribution !== (projection.loss_attribution ?? 'unknown')
    || confidence !== (projection.attribution_confidence ?? 'needs_more_evidence')
    || owner !== (projection.recovery_owner ?? 'unknown')
    || recoverability !== (projection.recoverability ?? 'unknown')
  );
  const correction = projection.responsibility_confirmation_state !== 'unconfirmed' || differs;
  const canSubmit = !busy && (!correction || rationale.trim().length >= 5);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const supporting = Object.entries(evidenceRole)
      .filter(([, role]) => role === 'supporting')
      .map(([id]) => id);
    const conflicting = Object.entries(evidenceRole)
      .filter(([, role]) => role === 'conflicting')
      .map(([id]) => id);
    const result = await mutateInvestigation(
      `/api/claims/${encodeURIComponent(caseId)}/responsibility`,
      {
        expected_version: projection.state_version,
        loss_attribution: attribution,
        attribution_confidence: confidence,
        recovery_owner: owner,
        recoverability,
        supporting_evidence_ids: supporting,
        conflicting_evidence_ids: conflicting,
        rationale: rationale.trim() || null,
      },
      keyRef.current,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.status === 409
        ? 'The case changed while this form was open. Refresh before confirming responsibility.'
        : result.error);
      return;
    }
    onSaved(correction ? 'Responsibility correction recorded.' : 'Responsibility confirmed.');
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={correction ? 'Correct responsibility' : 'Confirm responsibility'}
      description="This is the merchant’s audited assessment. It does not make the customer decision or submit a recovery claim."
      size="lg"
      closeOnBackdrop={!busy}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!canSubmit}>
            {correction ? 'Record correction' : 'Confirm assessment'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="ua-text-body rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3 text-[var(--ua-risk-critical)]">
            {error}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="ua-text-body font-medium">
            Responsible party
            <Select
              className="mt-1"
              value={attribution}
              onChange={(event) => setAttribution(event.target.value as LossAttributionLabel)}
            >
              {LOSS_ATTRIBUTION_LABELS.map((value) => (
                <option key={value} value={value}>{LOSS_ATTRIBUTION_DISPLAY[value]}</option>
              ))}
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Confidence
            <Select
              className="mt-1"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value as AttributionConfidence)}
            >
              {ATTRIBUTION_CONFIDENCES.map((value) => (
                <option key={value} value={value}>{ATTRIBUTION_CONFIDENCE_LABELS[value]}</option>
              ))}
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Recovery owner
            <Select
              className="mt-1"
              value={owner}
              onChange={(event) => setOwner(event.target.value as LikelyOwner)}
            >
              {LIKELY_OWNERS.map((value) => (
                <option key={value} value={value}>{LIKELY_OWNER_LABELS[value]}</option>
              ))}
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Recoverability
            <Select
              className="mt-1"
              value={recoverability}
              onChange={(event) => setRecoverability(event.target.value as Recoverability)}
            >
              {RECOVERABILITIES.map((value) => (
                <option key={value} value={value}>{RECOVERABILITY_LABELS[value]}</option>
              ))}
            </Select>
          </label>
        </div>

        <div>
          <p className="ua-text-body font-medium">Evidence relationship</p>
          {evidence.length === 0 ? (
            <p className="ua-text-caption-role mt-1">
              No canonical evidence is available to link. You can still keep responsibility unknown.
            </p>
          ) : (
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {evidence.map((item) => (
                <Card key={item.id} unstyled variant="muted" className="grid grid-cols-1 items-center gap-2 p-2.5 sm:grid-cols-[1fr_160px]">
                  <div className="min-w-0">
                    <p className="ua-text-working-title truncate text-[var(--ua-text-primary)]">
                      {item.title ?? item.evidence_type.replaceAll('_', ' ')}
                    </p>
                    <p className="ua-text-caption-role mt-0.5 line-clamp-2">
                      {item.summary ?? `Source: ${item.source_system}`}
                    </p>
                  </div>
                  <Select
                    aria-label={`Evidence role for ${item.title ?? item.evidence_type}`}
                    value={evidenceRole[item.id] ?? 'none'}
                    onChange={(event) => setEvidenceRole((current) => ({
                      ...current,
                      [item.id]: event.target.value as 'none' | 'supporting' | 'conflicting',
                    }))}
                  >
                    <option value="none">Not cited</option>
                    <option value="supporting">Supporting</option>
                    <option value="conflicting">Conflicting</option>
                  </Select>
                </Card>
              ))}
            </div>
          )}
        </div>

        <label className="ua-text-body block font-medium">
          {correction ? 'Correction rationale' : 'Confirmation note (optional)'}
          <textarea
            className={`ua-text-body mt-1 min-h-24 w-full rounded-md border bg-[var(--ua-surface-muted)] p-2 ${
              correction ? 'border-[var(--ua-warning-border)]' : 'border-[var(--ua-border-default)]'
            }`}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            required={correction}
          />
        </label>
      </div>
    </Modal>
  );
}

export function ResponsibilityAssessmentCard({
  caseId,
  canManage,
}: {
  caseId: string;
  canManage: boolean;
}) {
  const { data, loading, error, reload } = useFetchJson<ResponsibilityPayload>(
    `/api/claims/${encodeURIComponent(caseId)}/investigations`,
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const projection = data?.responsibility ?? null;
  const canMutate = canManage && data?.permissions.can_mutate !== false;

  return (
    <Card unstyled as="section" variant="panel" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 shrink-0 text-[var(--ua-action-primary)]" size={18} aria-hidden="true" />
          <div>
            <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-secondary)]">
              Responsibility
            </p>
            <h2 className="ua-text-section-title mt-1 text-[var(--ua-text-primary)]">
              Advisory assessment and merchant confirmation
            </h2>
          </div>
        </div>
        {projection ? (
          <StatusBadge
            family="workflowStatus"
            value={projection.responsibility_confirmation_state}
          />
        ) : null}
      </div>

      {loading && !data ? (
        <Bone className="mt-4 h-24" />
      ) : error || !projection ? (
        <div role="alert" className="ua-text-body mt-4 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3 text-[var(--ua-text-secondary)]">
          Responsibility assessment is unavailable. No confirmation has been recorded.
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card unstyled variant="muted" className="p-3">
              <p className="ua-text-caption-role">Current responsibility</p>
              <p className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">
                {LOSS_ATTRIBUTION_DISPLAY[projection.loss_attribution ?? 'unknown']}
              </p>
              <p className="ua-text-caption-role mt-1">
                {ATTRIBUTION_CONFIDENCE_LABELS[
                  projection.attribution_confidence ?? 'needs_more_evidence'
                ]}
              </p>
            </Card>
            <Card unstyled variant="muted" className="p-3">
              <p className="ua-text-caption-role">Recovery route</p>
              <p className="ua-text-working-title mt-1 text-[var(--ua-text-primary)]">
                {LIKELY_OWNER_LABELS[projection.recovery_owner ?? 'unknown']}
              </p>
              <p className="ua-text-caption-role mt-1">
                {RECOVERABILITY_LABELS[projection.recoverability ?? 'unknown']}
              </p>
            </Card>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3">
            {projection.responsibility_confirmation_state === 'unconfirmed'
              ? <ShieldAlert className="mt-0.5 shrink-0 text-[var(--ua-warning)]" size={15} aria-hidden="true" />
              : <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--ua-success)]" size={15} aria-hidden="true" />}
            <p className="ua-text-caption-role leading-relaxed">
              {projection.responsibility_confirmation_state === 'unconfirmed'
                ? 'This remains an advisory projection. Provider silence and “no issue found” do not assign responsibility.'
                : `Merchant assessment ${projection.responsibility_confirmation_state}${projection.responsibility_confirmed_at ? ` on ${formatDateTime(projection.responsibility_confirmed_at)}` : ''}. Later automated evaluation cannot overwrite it.`}
            </p>
          </div>
          {message ? (
            <p role="status" className="ua-text-caption-role mt-3 text-[var(--ua-success)]">{message}</p>
          ) : null}
          {canMutate ? (
            <Button className="mt-3" size="sm" variant="secondary" onClick={() => setOpen(true)}>
              {projection.responsibility_confirmation_state === 'unconfirmed'
                ? 'Confirm responsibility'
                : 'Correct responsibility'}
            </Button>
          ) : null}
        </>
      )}

      {open && projection ? (
        <ResponsibilityDialog
          caseId={caseId}
          projection={projection}
          evidence={data?.evidence_options ?? []}
          onClose={() => setOpen(false)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            reload();
          }}
        />
      ) : null}
    </Card>
  );
}
