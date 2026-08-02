'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  FileSearch,
  Pencil,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Bone, Button, Card, Input, Modal, Select, StatusBadge } from '@/components/ui';
import {
  InvestigationRequestDialog,
  type InvestigationPartnerOption,
} from '@/components/claims/investigations/InvestigationRequestDialog';
import { InvestigationResponseDialog } from '@/components/claims/investigations/InvestigationResponseDialog';
import { InvestigationTimeline } from '@/components/claims/investigations/InvestigationTimeline';
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from '@/lib/investigations/client';
import type {
  CaseInvestigation,
  InvestigationAggregate,
  InvestigationRecommendation,
} from '@/lib/investigations/types';
import { isInvestigationOverdue } from '@/lib/investigations/types';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { formatDateTime } from '@/lib/utils/format';

type SuggestedRequest = {
  subject: string;
  summary: string;
  body: string;
} | null;

type InvestigationsPayload = {
  investigations: CaseInvestigation[];
  aggregate: InvestigationAggregate;
  recommendation: InvestigationRecommendation | null;
  suggested_request: SuggestedRequest;
  partners: InvestigationPartnerOption[];
  settings: {
    reply_to_configured: boolean;
    email_enabled: boolean;
  };
  permissions: {
    can_mutate: boolean;
    writes_enabled: boolean;
    disabled_reason: string | null;
  };
};

type ActionKind = 'send-email' | 'mark-sent' | 'chase' | 'close' | 'cancel';

function toLocalDateTime(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function targetLabel(value: string): string {
  if (value === '3pl') return '3PL / fulfilment';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function InvestigationActionDialog({
  caseId,
  investigation,
  kind,
  onClose,
  onSaved,
}: {
  caseId: string;
  investigation: CaseInvestigation;
  kind: ActionKind;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [channel, setChannel] = useState<'manual' | 'portal' | 'api'>(
    investigation.source_channel === 'portal' || investigation.source_channel === 'api'
      ? investigation.source_channel
      : 'manual',
  );
  const [dueAt, setDueAt] = useState(toLocalDateTime(investigation.due_at));
  const [externalReference, setExternalReference] = useState(
    investigation.external_reference ?? '',
  );
  const [externalUrl, setExternalUrl] = useState(investigation.external_url ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(
    newInvestigationIdempotencyKey(`investigation-${kind}:${investigation.id}`),
  );

  const title = {
    'send-email': 'Send investigation email',
    'mark-sent': 'Mark request sent',
    chase: 'Record a chase',
    close: investigation.status === 'waiting_response'
      ? 'Close with no response'
      : 'Close reviewed response',
    cancel: 'Cancel investigation',
  }[kind];
  const noteRequired = kind === 'chase' || kind === 'cancel'
    || (kind === 'close' && investigation.status === 'waiting_response');
  const sendFieldsValid = kind === 'send-email'
    ? Boolean(dueAt)
    : kind === 'mark-sent'
      ? (
          Boolean(dueAt)
          && (
            channel !== 'portal'
            || Boolean(externalReference.trim() || externalUrl.trim())
          )
        )
      : true;
  const canSubmit = !busy
    && sendFieldsValid
    && (!noteRequired || note.trim().length >= 5);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const actionPath = kind === 'send-email' ? 'send' : kind;
    const path = `/api/claims/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(investigation.id)}/${actionPath}`;
    let body: Record<string, unknown>;
    if (kind === 'send-email') {
      body = {
        expected_version: investigation.state_version,
        due_at: new Date(dueAt).toISOString(),
      };
    } else if (kind === 'mark-sent') {
      body = {
        expected_version: investigation.state_version,
        source_channel: channel,
        due_at: new Date(dueAt).toISOString(),
        external_reference: externalReference.trim() || undefined,
        external_url: externalUrl.trim() || undefined,
        note: note.trim() || undefined,
      };
    } else if (kind === 'chase') {
      body = {
        expected_version: investigation.state_version,
        note: note.trim(),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      };
    } else if (kind === 'cancel') {
      body = {
        expected_version: investigation.state_version,
        closure_reason: note.trim(),
      };
    } else {
      body = {
        expected_version: investigation.state_version,
        no_response: investigation.status === 'waiting_response',
        closure_reason: note.trim() || null,
      };
    }
    const result = await mutateInvestigation(path, body, keyRef.current);
    setBusy(false);
    if (!result.ok) {
      setError(result.status === 409
        ? 'This investigation changed. Refresh before applying this action.'
        : result.error);
      return;
    }
    onSaved(
      kind === 'send-email'
        ? 'Email accepted by the provider and the response-due Work task was created.'
        : kind === 'mark-sent'
        ? 'Request marked sent and a response-due Work task was created.'
        : kind === 'chase'
          ? 'Chase recorded and the response deadline was updated.'
          : kind === 'cancel'
            ? 'Investigation cancelled.'
            : 'Investigation closed.',
    );
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="md"
      closeOnBackdrop={!busy}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant={kind === 'cancel' ? 'danger' : 'primary'}
            onClick={() => void submit()}
            loading={busy}
            disabled={!canSubmit}
          >
            {title}
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
        {kind === 'send-email' ? (
          <>
            <div className="ua-text-caption-role rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3">
              <p><span className="font-semibold text-[var(--ua-text-primary)]">To:</span> {investigation.recipient}</p>
              <p className="mt-1"><span className="font-semibold text-[var(--ua-text-primary)]">Subject:</span> {investigation.subject}</p>
              <p className="mt-2">The request becomes waiting only after the email provider returns an acceptance ID.</p>
            </div>
            <label className="ua-text-body block font-medium">
              Response due
              <Input
                className="mt-1"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </label>
          </>
        ) : null}
        {kind === 'mark-sent' ? (
          <>
            <label className="ua-text-body block font-medium">
              Send channel
              <Select
                className="mt-1"
                value={channel}
                onChange={(event) => setChannel(event.target.value as typeof channel)}
              >
                <option value="manual">Copied / manual</option>
                <option value="portal">Partner portal</option>
                <option value="api">External API reference</option>
              </Select>
            </label>
            <label className="ua-text-body block font-medium">
              Response due
              <Input
                className="mt-1"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="ua-text-body font-medium">
                External reference
                <Input
                  className="mt-1"
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </label>
              <label className="ua-text-body font-medium">
                Portal URL
                <Input
                  className="mt-1"
                  type="url"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                />
              </label>
            </div>
          </>
        ) : null}
        {kind === 'chase' ? (
          <label className="ua-text-body block font-medium">
            New response due
            <Input
              className="mt-1"
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
        ) : null}
        {kind !== 'send-email' && (kind !== 'mark-sent' || channel === 'portal') ? (
          <label className="ua-text-body block font-medium">
            {kind === 'chase'
              ? 'Chase note'
              : kind === 'cancel'
                ? 'Cancellation reason'
                : kind === 'close'
                  ? 'Closure rationale'
                  : 'Send note (optional)'}
            <textarea
              className="ua-text-body mt-1 min-h-24 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required={noteRequired}
            />
          </label>
        ) : null}
        {kind === 'close' && investigation.status === 'waiting_response' ? (
          <p className="ua-text-caption-role rounded-md border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-[var(--ua-warning)]">
            Provider silence is recorded as “no response” and remains neutral. It does not assign responsibility.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export function CaseInvestigationsCard({
  caseId,
  canManage,
  onRecommendationRefresh,
}: {
  caseId: string;
  canManage: boolean;
  onRecommendationRefresh?: () => void;
}) {
  const url = `/api/claims/${encodeURIComponent(caseId)}/investigations`;
  const { data, loading, error, reload } = useFetchJson<InvestigationsPayload>(url);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editing, setEditing] = useState<CaseInvestigation | null>(null);
  const [responding, setResponding] = useState<CaseInvestigation | null>(null);
  const [action, setAction] = useState<{ kind: ActionKind; item: CaseInvestigation } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function refreshed(nextMessage?: string | null) {
    if (nextMessage !== undefined) setMessage(nextMessage);
    reload();
    onRecommendationRefresh?.();
  }

  async function copyRequest(investigation: CaseInvestigation) {
    try {
      await navigator.clipboard.writeText(
        `${investigation.subject}\n\n${investigation.request_body}`,
      );
      setMessage('Request copied. Mark it sent only after you complete the external action.');
    } catch {
      setMessage('The request could not be copied. Select the draft text and copy it manually.');
    }
  }

  const investigations = data?.investigations ?? [];
  const canMutate = canManage && data?.permissions.can_mutate !== false;
  const emailReady = data?.settings.email_enabled === true
    && data.settings.reply_to_configured;

  return (
    <Card
      unstyled
      id="case-investigations"
      as="section"
      variant="panel"
      className="p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-secondary)]">
            Investigations
          </p>
          <h2 className="ua-text-section-title mt-1 text-[var(--ua-text-primary)]">
            Resolve the material evidence gap
          </h2>
          <p className="ua-text-caption-role mt-1 max-w-2xl leading-relaxed">
            Track targeted requests without blocking or deciding the customer outcome automatically.
          </p>
        </div>
        {canMutate ? (
          <Button
            size="sm"
            leadingIcon={<Plus />}
            onClick={() => setRequestOpen(true)}
          >
            New request
          </Button>
        ) : null}
      </div>

      {message ? (
        <div role="status" className="ua-text-caption-role mt-3 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3">
          {message}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="mt-4 space-y-2" aria-label="Loading investigations">
          <Bone className="h-16" />
          <Bone className="h-16" />
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3">
          <p className="ua-text-body text-[var(--ua-risk-critical)]">
            Investigation details are unavailable. No action has been taken.
          </p>
          <Button className="mt-3" size="sm" variant="secondary" leadingIcon={<RefreshCw />} onClick={reload}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {data?.aggregate.open ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Open', data.aggregate.open],
                ['Waiting', data.aggregate.waiting],
                ['Overdue', data.aggregate.overdue],
                ['Review', data.aggregate.awaitingReview],
              ].map(([label, value]) => (
                <Card key={String(label)} unstyled variant="muted" className="p-2.5">
                  <p className="ua-text-section-title text-[var(--ua-text-primary)]">{value}</p>
                  <p className="ua-text-metadata">{label}</p>
                </Card>
              ))}
            </div>
          ) : null}

          {investigations.length === 0 ? (
            <Card unstyled variant="muted" className="mt-4 p-4">
              {data?.recommendation ? (
                <div className="flex items-start gap-3">
                  <FileSearch className="mt-0.5 shrink-0 text-[var(--ua-action-primary)]" size={18} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="ua-text-working-title text-[var(--ua-text-primary)]">
                      Recommended: ask {data.recommendation.targetName ?? targetLabel(data.recommendation.targetType)}
                    </p>
                    <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">
                      {data.recommendation.evidenceGap}
                    </p>
                    <p className="ua-text-caption-role mt-2">
                      {data.recommendation.reason}
                    </p>
                    {canMutate ? (
                      <Button className="mt-3" size="sm" onClick={() => setRequestOpen(true)}>
                        Review request draft
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="ua-text-body text-[var(--ua-text-secondary)]">
                  No investigation has been recorded for this case. Start one when a material factual question remains.
                </p>
              )}
            </Card>
          ) : (
            <div className="mt-4 space-y-3">
              {investigations.map((investigation) => {
                const overdue = isInvestigationOverdue(investigation);
                return (
                  <Card
                    unstyled
                    key={investigation.id}
                    id={`investigation-${investigation.id}`}
                    variant="muted"
                    className="scroll-mt-24 p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            family="workflowStatus"
                            value={overdue ? 'overdue' : investigation.status}
                          />
                          {investigation.is_primary ? (
                            <span className="rounded-full border border-[var(--ua-border-default)] px-2 py-0.5 text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-secondary)]">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <p className="ua-text-working-title mt-2 text-[var(--ua-text-primary)]">
                          {investigation.target_name ?? targetLabel(investigation.target_type)}
                        </p>
                        <p className="ua-text-body mt-1 text-[var(--ua-text-secondary)]">
                          {investigation.evidence_gap}
                        </p>
                      </div>
                      {investigation.due_at && investigation.status === 'waiting_response' ? (
                        <div className={`ua-text-dense flex items-center gap-1.5 ${overdue ? 'text-[var(--ua-risk-critical)]' : 'text-[var(--ua-text-secondary)]'}`}>
                          {overdue ? <AlertTriangle size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}
                          <time dateTime={investigation.due_at}>
                            {overdue ? 'Overdue ' : 'Due '}{formatDateTime(investigation.due_at)}
                          </time>
                        </div>
                      ) : null}
                    </div>

                    {investigation.response_summary ? (
                      <div className="mt-3 rounded-md border border-[var(--ua-info-border)] bg-[var(--ua-info-bg)] p-3">
                        <p className="ua-text-working-title flex items-center gap-2 text-[var(--ua-info)]">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Latest response
                        </p>
                        <p className="ua-text-body mt-1 text-[var(--ua-text-primary)]">
                          {investigation.response_summary}
                        </p>
                      </div>
                    ) : null}

                    {investigation.status === 'draft' ? (
                      <div className="mt-3 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-3">
                        <p className="ua-text-working-title text-[var(--ua-text-primary)]">
                          {investigation.subject}
                        </p>
                        <p className="ua-text-caption-role mt-2 whitespace-pre-wrap leading-relaxed">
                          {investigation.request_body}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {investigation.status === 'draft' && canMutate ? (
                        <>
                          <Button size="sm" variant="secondary" leadingIcon={<Pencil />} onClick={() => setEditing(investigation)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="secondary" leadingIcon={<Clipboard />} onClick={() => void copyRequest(investigation)}>
                            Copy
                          </Button>
                          {emailReady && investigation.recipient ? (
                            <Button size="sm" leadingIcon={<Send />} onClick={() => setAction({ kind: 'send-email', item: investigation })}>
                              Send email
                            </Button>
                          ) : null}
                          {investigation.external_url ? (
                            <Button size="sm" variant="secondary" leadingIcon={<ExternalLink />} onClick={() => window.open(investigation.external_url!, '_blank', 'noopener,noreferrer')}>
                              Open portal
                            </Button>
                          ) : null}
                          <Button size="sm" variant={emailReady ? 'secondary' : 'primary'} leadingIcon={<Send />} onClick={() => setAction({ kind: 'mark-sent', item: investigation })}>
                            Mark sent
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'cancel', item: investigation })}>
                            Cancel
                          </Button>
                        </>
                      ) : null}
                      {investigation.status === 'waiting_response' && canMutate ? (
                        <>
                          <Button size="sm" onClick={() => setResponding(investigation)}>
                            Record response
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'chase', item: investigation })}>
                            Record chase
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'close', item: investigation })}>
                            Close no response
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'cancel', item: investigation })}>
                            Cancel
                          </Button>
                        </>
                      ) : null}
                      {investigation.status === 'response_received' && canMutate ? (
                        <Button size="sm" onClick={() => setAction({ kind: 'close', item: investigation })}>
                          Mark reviewed
                        </Button>
                      ) : null}
                    </div>
                    <InvestigationTimeline investigation={investigation} />
                  </Card>
                );
              })}
            </div>
          )}
          {!canMutate ? (
            <p className="ua-text-caption-role mt-3">
              {data?.permissions.disabled_reason
                ?? 'You have read-only access. A case decision role is required to change investigations.'}
            </p>
          ) : null}
        </>
      )}

      {requestOpen && data ? (
        <InvestigationRequestDialog
          caseId={caseId}
          recommendation={data.recommendation}
          suggestedRequest={data.suggested_request}
          partners={data.partners}
          onClose={() => setRequestOpen(false)}
          onSaved={() => refreshed('Investigation draft saved. Nothing has been sent.')}
        />
      ) : null}
      {editing && data ? (
        <InvestigationRequestDialog
          caseId={caseId}
          existing={editing}
          recommendation={data.recommendation}
          suggestedRequest={data.suggested_request}
          partners={data.partners}
          onClose={() => setEditing(null)}
          onSaved={() => refreshed('Investigation draft updated.')}
        />
      ) : null}
      {responding ? (
        <InvestigationResponseDialog
          caseId={caseId}
          investigation={responding}
          onClose={() => setResponding(null)}
          onSaved={(nextMessage) => refreshed(nextMessage)}
        />
      ) : null}
      {action ? (
        <InvestigationActionDialog
          caseId={caseId}
          investigation={action.item}
          kind={action.kind}
          onClose={() => setAction(null)}
          onSaved={(nextMessage) => refreshed(nextMessage)}
        />
      ) : null}
    </Card>
  );
}
