'use client';

import { useMemo, useRef, useState } from 'react';
import { BeforeYouConfirm, Button, Input, Modal, Select, Textarea } from '@/components/ui';
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
      title={existing ? 'Edit investigation draft' : 'Request evidence from a partner'}
      description="Draft a targeted factual request. Nothing is sent until you explicitly send or mark it sent."
      overlayId="investigation-request-modal"
      size="lg"
      closeOnBackdrop={!busy}
      footer={(
        <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ margin: 0, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
            The customer decision remains independent from this deadline.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error ? (
          <div role="alert" style={{ border: '1px solid #edc6b5', borderRadius: 6, background: '#fdf0e6', padding: 12, color: '#b0431a', fontSize: 13, lineHeight: '20px' }}>
            {error}
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Target
            <Select
              style={{ marginTop: 4 }}
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as InvestigationTarget)}
            >
              {Object.entries(TARGET_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </label>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Partner
            <Select
              style={{ marginTop: 4 }}
              value={partnerId}
              onChange={(event) => selectPartner(event.target.value)}
            >
              <option value="">No configured partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name}</option>
              ))}
            </Select>
          </label>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Channel
            <Select
              style={{ marginTop: 4 }}
              value={channel}
              onChange={(event) => setChannel(event.target.value as typeof channel)}
            >
              <option value="manual">Manual / copied</option>
              <option value="portal">Partner portal</option>
              <option value="email">Configured email</option>
              <option value="api">External API reference</option>
            </Select>
          </label>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Response due
            <Input
              style={{ marginTop: 4 }}
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
        </div>
        <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
          Material evidence gap
          <Textarea
            style={{ minHeight: 80, marginTop: 4 }}
            value={evidenceGap}
            onChange={(event) => setEvidenceGap(event.target.value)}
            required
          />
        </label>
        <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
          Requested evidence
          <Input
            style={{ marginTop: 4 }}
            value={requestedEvidence}
            onChange={(event) => setRequestedEvidence(event.target.value)}
            placeholder="delivery photo, scan history, final parcel weight"
          />
          <span style={{ display: 'block', marginTop: 4, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
            Separate items with commas.
          </span>
        </label>
        <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
          Request summary
          <Input
            style={{ marginTop: 4 }}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Recipient
            <Input
              style={{ marginTop: 4 }}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="ops@partner.test"
            />
          </label>
          <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Subject
            <Input
              style={{ marginTop: 4 }}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </label>
        </div>
        <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
          Request body
          <Textarea
            style={{ minHeight: 224, marginTop: 4, font: "400 12px/1.625 'IBM Plex Mono', monospace" }}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        {overridesRecommendation ? (
          <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            Override rationale
            <Textarea
              style={{ minHeight: 80, marginTop: 4, borderColor: '#ead8b6', background: '#fff3e9' }}
              value={overrideRationale}
              onChange={(event) => setOverrideRationale(event.target.value)}
              placeholder="Explain why this target or question is more appropriate."
              required
            />
          </label>
        ) : null}
        {selectedPartner?.contact_instructions ? (
          <div style={{ border: '1px solid #e4e3e0', borderRadius: 6, background: '#f4f3f1', padding: 12, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
            <span style={{ color: '#1c1f23', fontWeight: 600 }}>Partner instructions: </span>
            {selectedPartner.contact_instructions}
          </div>
        ) : null}
        <BeforeYouConfirm
          objectSummary={`${caseId} · ${existing ? `investigation ${existing.id}` : 'new investigation draft'}`}
          valueSummary="No financial value changes."
          externalAction="None yet. Saving this form does not send email or submit through a partner portal."
          reversible="Yes. The draft can be revised or cancelled before any explicit send action."
          appendOnly={`${existing ? 'A draft-update audit event' : 'A new investigation draft'}${dueAt ? ` with response due ${dueAt.replace('T', ' ')}` : ' with no recorded deadline'}.`}
        />
      </div>
    </Modal>
  );
}
