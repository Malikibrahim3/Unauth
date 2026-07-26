'use client';

import { useRef, useState } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from '@/lib/investigations/client';
import type {
  CaseInvestigation,
  InvestigationResponseOutcome,
} from '@/lib/investigations/types';

const OUTCOME_LABELS: Record<
  Exclude<InvestigationResponseOutcome, 'no_response'>,
  string
> = {
  issue_confirmed: 'Issue confirmed',
  no_issue_found: 'No issue found',
  inconclusive: 'Inconclusive',
  referred_elsewhere: 'Referred elsewhere',
};

type AttachmentResult = {
  status: 'none' | 'clean' | 'quarantined' | 'failed';
  message: string | null;
};

export function InvestigationResponseDialog({
  caseId,
  investigation,
  onClose,
  onSaved,
}: {
  caseId: string;
  investigation: CaseInvestigation;
  onClose: () => void;
  onSaved: (message: string | null) => void;
}) {
  const [outcome, setOutcome] = useState<
    Exclude<InvestigationResponseOutcome, 'no_response'>
  >('inconclusive');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [responderName, setResponderName] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const responseKeyRef = useRef(
    newInvestigationIdempotencyKey(`investigation-response:${investigation.id}`),
  );
  const fileKeyRef = useRef(
    newInvestigationIdempotencyKey(`investigation-file:${investigation.id}`),
  );
  const linkKeyRef = useRef(
    newInvestigationIdempotencyKey(`investigation-link:${investigation.id}`),
  );

  async function attachEvidence(): Promise<AttachmentResult> {
    const attachmentUrl = `/api/claims/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(investigation.id)}/attachments`;
    if (file) {
      const formData = new FormData();
      formData.set('file', file);
      try {
        const response = await fetch(attachmentUrl, {
          method: 'POST',
          headers: { 'Idempotency-Key': fileKeyRef.current },
          body: formData,
        });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) {
          return {
            status: 'failed',
            message:
              typeof payload.error === 'string'
                ? payload.error
                : 'The response was saved, but the file upload failed.',
          };
        }
        return {
          status: 'quarantined',
          message: 'Response saved. The file is private and quarantined until its safety scan passes.',
        };
      } catch {
        return {
          status: 'failed',
          message: 'The response was saved, but the file upload could not be completed.',
        };
      }
    }
    if (externalUrl.trim()) {
      const result = await mutateInvestigation(
        attachmentUrl,
        {
          external_url: externalUrl.trim(),
          label: externalReference.trim() || 'Investigation response reference',
        },
        linkKeyRef.current,
      );
      if (!result.ok) {
        return {
          status: 'failed',
          message: `The response was saved, but the evidence link failed: ${result.error}`,
        };
      }
      return {
        status: 'clean',
        message: 'Response and validated HTTPS evidence link saved.',
      };
    }
    return { status: 'none', message: null };
  }

  async function submit() {
    if (summary.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    const result = await mutateInvestigation(
      `/api/claims/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(investigation.id)}/response`,
      {
        expected_version: investigation.state_version,
        response_outcome: outcome,
        response_summary: summary.trim(),
        response_body: body.trim() || null,
        responder_name: responderName.trim() || null,
        external_reference: externalReference.trim() || null,
        external_url: externalUrl.trim() || null,
      },
      responseKeyRef.current,
    );
    if (!result.ok) {
      setBusy(false);
      setError(result.status === 409
        ? 'This investigation changed while the response form was open. Refresh before recording it again.'
        : result.error);
      return;
    }
    const attachment = await attachEvidence();
    setBusy(false);
    const reevaluationStatus = result.data.reevaluation_status;
    const evidenceStatus = result.data.evidence_status;
    const followUp = attachment.message
      ?? (
        reevaluationStatus === 'pending_retry' || evidenceStatus === 'pending_retry'
          ? 'Response saved. Evidence projection or re-evaluation is pending retry.'
          : 'Response saved and the case recommendation was refreshed.'
      );
    onSaved(followUp);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record investigation response"
      description={`Record the factual response from ${investigation.target_name ?? investigation.target_type}. This does not make the customer decision.`}
      size="lg"
      closeOnBackdrop={!busy}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => void submit()}
            loading={busy}
            disabled={busy || summary.trim().length < 3}
          >
            Record response
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3 text-sm text-[var(--ua-risk-critical)]">
            {error}
          </div>
        ) : null}
        <label className="block text-sm font-medium">
          Outcome
          <Select
            className="mt-1"
            value={outcome}
            onChange={(event) => setOutcome(
              event.target.value as Exclude<InvestigationResponseOutcome, 'no_response'>,
            )}
          >
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>
        {outcome === 'no_issue_found' ? (
          <p className="rounded-md border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-xs text-[var(--ua-warning)]">
            “No issue found” is neutral. It does not prove another party or the customer caused the issue.
          </p>
        ) : null}
        <label className="block text-sm font-medium">
          Response summary
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2 text-sm"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Full response (optional)
          <textarea
            className="mt-1 min-h-40 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2 text-sm"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Responder name
            <Input
              className="mt-1"
              value={responderName}
              onChange={(event) => setResponderName(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium">
            External reference
            <Input
              className="mt-1"
              value={externalReference}
              onChange={(event) => setExternalReference(event.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Public HTTPS evidence link (optional)
          <Input
            className="mt-1"
            type="url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="https://partner.example/evidence/reference"
          />
        </label>
        <label className="block text-sm font-medium">
          Evidence file (optional, 10 MB maximum)
          <Input
            className="mt-1 h-auto py-2"
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="mt-1 block text-xs text-[var(--ua-text-secondary)]">
            Files are stored privately in quarantine and cannot influence a decision until a safety scan marks them clean.
          </span>
        </label>
      </div>
    </Modal>
  );
}
