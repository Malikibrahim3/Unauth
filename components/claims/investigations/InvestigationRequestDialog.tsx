'use client';

import { useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from '@/lib/investigations/client';
import type {
  CaseInvestigation,
  InvestigationRecommendation,
  InvestigationTarget,
} from '@/lib/investigations/types';

export type InvestigationPartnerOption = {
  id: string;
  name: string;
  partner_type: string;
  contact_email: string | null;
  contact_url: string | null;
  default_contact_channel: string | null;
  response_sla_hours: number | null;
  contact_instructions: string | null;
};

type SuggestedRequest = {
  subject: string;
  summary: string;
  body: string;
} | null;

const TARGET_LABELS: Record<InvestigationTarget, string> = {
  carrier: 'Carrier',
  '3pl': '3PL / fulfilment',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  customer: 'Customer',
  internal: 'Internal team',
};

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function InvestigationRequestDialog({
  caseId,
  recommendation,
  suggestedRequest,
  partners,
  existing,
  onClose,
  onSaved,
}: {
  caseId: string;
  recommendation: InvestigationRecommendation | null;
  suggestedRequest: SuggestedRequest;
  partners: InvestigationPartnerOption[];
  existing?: CaseInvestigation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const recommendedTarget = existing?.target_type ?? recommendation?.targetType ?? 'internal';
  const recommendedPartner = existing?.partner_id ?? recommendation?.partnerId ?? '';
  const [targetType, setTargetType] = useState<InvestigationTarget>(recommendedTarget);
  const [partnerId, setPartnerId] = useState(recommendedPartner);
  const [evidenceGap, setEvidenceGap] = useState(
    existing?.evidence_gap ?? recommendation?.evidenceGap ?? '',
  );
  const [requestedEvidence, setRequestedEvidence] = useState(
    (existing?.requested_evidence ?? recommendation?.requestedEvidence ?? []).join(', '),
  );
  const [summary, setSummary] = useState(
    existing?.request_summary ?? suggestedRequest?.summary ?? '',
  );
  const [subject, setSubject] = useState(
    existing?.subject ?? suggestedRequest?.subject ?? '',
  );
  const [body, setBody] = useState(
    existing?.request_body ?? suggestedRequest?.body ?? '',
  );
  const [recipient, setRecipient] = useState(() => {
    if (existing?.recipient) return existing.recipient;
    const partner = partners.find((item) => item.id === recommendedPartner);
    return partner?.contact_email ?? '';
  });
  const [channel, setChannel] = useState<'manual' | 'portal' | 'email' | 'api'>(
    () => {
      if (
        existing?.source_channel === 'portal'
        || existing?.source_channel === 'email'
        || existing?.source_channel === 'api'
        || existing?.source_channel === 'manual'
      ) {
        return existing.source_channel;
      }
      const partner = partners.find((item) => item.id === recommendedPartner);
      const candidate = partner?.default_contact_channel;
      return candidate === 'portal' || candidate === 'email' || candidate === 'api'
        ? candidate
        : 'manual';
    },
  );
  const [dueAt, setDueAt] = useState(
    toLocalDateTime(existing?.due_at ?? recommendation?.dueAt),
  );
  const [overrideRationale, setOverrideRationale] = useState(
    existing?.override_rationale ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(newInvestigationIdempotencyKey(
    existing
      ? `investigation-update:${existing.id}`
      : `investigation-create:${caseId}`,
  ));

  const selectedPartner = useMemo(
    () => partners.find((item) => item.id === partnerId) ?? null,
    [partnerId, partners],
  );
  const overridesRecommendation = Boolean(
    recommendation
      && (
        targetType !== recommendation.targetType
        || (partnerId || null) !== recommendation.partnerId
        || evidenceGap.trim() !== recommendation.evidenceGap
      ),
  );
  const canSubmit = (
    !busy
    && evidenceGap.trim().length >= 3
    && summary.trim().length > 0
    && subject.trim().length > 0
    && body.trim().length > 0
    && (!overridesRecommendation || overrideRationale.trim().length >= 5)
  );

  function selectPartner(nextId: string) {
    setPartnerId(nextId);
    const partner = partners.find((item) => item.id === nextId);
    if (!partner) return;
    setRecipient(partner.contact_email ?? '');
    if (
      partner.default_contact_channel === 'portal'
      || partner.default_contact_channel === 'email'
      || partner.default_contact_channel === 'api'
      || partner.default_contact_channel === 'manual'
    ) {
      setChannel(partner.default_contact_channel);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const result = await mutateInvestigation(
      existing
        ? `/api/claims/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(existing.id)}`
        : `/api/claims/${encodeURIComponent(caseId)}/investigations`,
      {
        ...(existing ? { expected_version: existing.state_version } : {}),
        target_type: targetType,
        target_name: selectedPartner?.name ?? TARGET_LABELS[targetType],
        partner_id: partnerId || null,
        ...(!existing ? { is_primary: true } : {}),
        evidence_gap: evidenceGap.trim(),
        recommended_reason: recommendation?.reason ?? null,
        override_rationale: overrideRationale.trim() || null,
        requested_evidence: requestedEvidence
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        request_summary: summary.trim(),
        subject: subject.trim(),
        request_body: body.trim(),
        recipient: recipient.trim() || null,
        source_channel: channel,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      },
      keyRef.current,
      existing ? 'PATCH' : 'POST',
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.status === 409
        ? 'This case changed while you were drafting. Refresh and review the current investigation.'
        : result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit investigation draft' : 'Create investigation request'}
      description="Draft a targeted factual request. Nothing is sent until you explicitly send or mark it sent."
      size="lg"
      closeOnBackdrop={!busy}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="ua-text-caption-role">
            The customer decision remains independent from this deadline.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} loading={busy} disabled={!canSubmit}>
              {existing ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
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
            Target
            <Select
              className="mt-1"
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as InvestigationTarget)}
            >
              {Object.entries(TARGET_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Partner
            <Select
              className="mt-1"
              value={partnerId}
              onChange={(event) => selectPartner(event.target.value)}
            >
              <option value="">No configured partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name}</option>
              ))}
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Channel
            <Select
              className="mt-1"
              value={channel}
              onChange={(event) => setChannel(event.target.value as typeof channel)}
            >
              <option value="manual">Manual / copied</option>
              <option value="portal">Partner portal</option>
              <option value="email">Configured email</option>
              <option value="api">External API reference</option>
            </Select>
          </label>
          <label className="ua-text-body font-medium">
            Response due
            <Input
              className="mt-1"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
        </div>
        <label className="ua-text-body block font-medium">
          Material evidence gap
          <textarea
            className="ua-text-body mt-1 min-h-20 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2"
            value={evidenceGap}
            onChange={(event) => setEvidenceGap(event.target.value)}
            required
          />
        </label>
        <label className="ua-text-body block font-medium">
          Requested evidence
          <Input
            className="mt-1"
            value={requestedEvidence}
            onChange={(event) => setRequestedEvidence(event.target.value)}
            placeholder="delivery photo, scan history, final parcel weight"
          />
          <span className="ua-text-caption-role mt-1 block">
            Separate items with commas.
          </span>
        </label>
        <label className="ua-text-body block font-medium">
          Request summary
          <Input
            className="mt-1"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="ua-text-body font-medium">
            Recipient
            <Input
              className="mt-1"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="ops@partner.example"
            />
          </label>
          <label className="ua-text-body font-medium">
            Subject
            <Input
              className="mt-1"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </label>
        </div>
        <label className="ua-text-body block font-medium">
          Request body
          <textarea
            className="mt-1 min-h-56 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2 font-mono text-xs leading-relaxed"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        {overridesRecommendation ? (
          <label className="ua-text-body block font-medium">
            Override rationale
            <textarea
              className="ua-text-body mt-1 min-h-20 w-full rounded-md border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-2"
              value={overrideRationale}
              onChange={(event) => setOverrideRationale(event.target.value)}
              placeholder="Explain why this target or question is more appropriate."
              required
            />
          </label>
        ) : null}
        {selectedPartner?.contact_instructions ? (
          <div className="ua-text-caption-role rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3">
            <span className="font-semibold text-[var(--ua-text-primary)]">Partner instructions: </span>
            {selectedPartner.contact_instructions}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
