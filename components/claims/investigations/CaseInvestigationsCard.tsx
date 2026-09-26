'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BeforeYouConfirm, Bone, Button, Card, Input, Modal, Select, StatusBadge, Textarea } from '@/components/ui';
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

function InvestigationIcon({ kind, size = 14, style }: { kind: 'alert' | 'check' | 'clipboard' | 'clock' | 'external' | 'search' | 'pencil' | 'plus' | 'refresh' | 'send'; size?: number; style?: CSSProperties }) {
  const paths = {
    alert: <><path d="M7 1.5 13 12H1Z"/><path d="M7 5v3M7 10.2v.1"/></>,
    check: <><circle cx="7" cy="7" r="5.2"/><path d="m4.5 7.1 1.6 1.6 3.5-3.5"/></>,
    clipboard: <><rect x="3" y="2.5" width="8" height="10" rx="1.5"/><path d="M5 2.5V1.5h4v1M5 5.5h4M5 8h4"/></>,
    clock: <><circle cx="7" cy="7" r="5.2"/><path d="M7 4v3.2l2.2 1.2"/></>,
    external: <><path d="M8 2h4v4M12 2 6.5 7.5"/><path d="M10.5 7.5v3A1.5 1.5 0 0 1 9 12H3.5A1.5 1.5 0 0 1 2 10.5V5a1.5 1.5 0 0 1 1.5-1.5h3"/></>,
    search: <><circle cx="6" cy="6" r="3.8"/><path d="m8.8 8.8 3 3"/></>,
    pencil: <><path d="m2.5 11.5.6-2.7 6.8-6.8 2.1 2.1-6.8 6.8Z"/><path d="m8.8 3.1 2.1 2.1"/></>,
    plus: <path d="M7 2.5v9M2.5 7h9"/>,
    refresh: <><path d="M11.5 4V1.8L9.4 4"/><path d="M11.2 4A5 5 0 1 0 12 8"/></>,
    send: <><path d="m1.5 2 11 5-11 5 2.2-5Z"/><path d="M3.7 7h8.8"/></>,
  } as const;
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[kind]}</svg>;
}

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
  const externalAction = kind === 'send-email'
    ? `Yes. An email leaves Unauth for ${investigation.recipient ?? 'the recorded recipient'}.`
    : kind === 'mark-sent'
      ? 'Already occurred outside Unauth. This records the supplied channel and reference.'
      : 'None. This records an internal investigation transition only.';
  const appendedRecord = kind === 'send-email' || kind === 'mark-sent'
    ? `A sent transition and response-due work item${dueAt ? ` for ${dueAt.replace('T', ' ')}` : ''}.`
    : kind === 'chase'
      ? 'A chase transition and the revised response deadline.'
      : kind === 'cancel'
        ? 'A cancellation transition with its rationale.'
        : 'A closure transition; provider silence remains a neutral fact.';

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
      overlayId="investigation-lifecycle-action-modal"
      size="md"
      closeOnBackdrop={!busy}
      footer={(
        <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', gap: 8 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error ? (
          <div role="alert" style={{ border: '1px solid #edc6b5', borderRadius: 6, background: '#fdf0e6', padding: 12, color: '#b0431a', fontSize: 13, lineHeight: '20px' }}>
            {error}
          </div>
        ) : null}
        {kind === 'send-email' ? (
          <>
            <div style={{ border: '1px solid #e4e3e0', borderRadius: 6, background: '#f4f3f1', padding: 12, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
              <p style={{ margin: 0 }}><span style={{ color: '#1c1f23', fontWeight: 600 }}>To:</span> {investigation.recipient}</p>
              <p style={{ margin: '4px 0 0' }}><span style={{ color: '#1c1f23', fontWeight: 600 }}>Subject:</span> {investigation.subject}</p>
              <p style={{ margin: '8px 0 0' }}>The request becomes waiting only after the email provider returns an acceptance ID.</p>
            </div>
            <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
              Response due
              <Input
                style={{ marginTop: 4 }}
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
            <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
              Send channel
              <Select
                style={{ marginTop: 4 }}
                value={channel}
                onChange={(event) => setChannel(event.target.value as typeof channel)}
              >
                <option value="manual">Copied / manual</option>
                <option value="portal">Partner portal</option>
                <option value="api">External API reference</option>
              </Select>
            </label>
            <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
              Response due
              <Input
                style={{ marginTop: 4 }}
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
              <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                External reference
                <Input
                  style={{ marginTop: 4 }}
                  value={externalReference}
                  onChange={(event) => setExternalReference(event.target.value)}
                />
              </label>
              <label style={{ color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                Portal URL
                <Input
                  style={{ marginTop: 4 }}
                  type="url"
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                />
              </label>
            </div>
          </>
        ) : null}
        {kind === 'chase' ? (
          <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            New response due
            <Input
              style={{ marginTop: 4 }}
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </label>
        ) : null}
        {kind !== 'send-email' && (kind !== 'mark-sent' || channel === 'portal') ? (
          <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            {kind === 'chase'
              ? 'Chase note'
              : kind === 'cancel'
                ? 'Cancellation reason'
                : kind === 'close'
                  ? 'Closure rationale'
                  : 'Send note (optional)'}
            <Textarea
              style={{ minHeight: 96, marginTop: 4 }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required={noteRequired}
            />
          </label>
        ) : null}
        {kind === 'close' && investigation.status === 'waiting_response' ? (
          <p style={{ margin: 0, border: '1px solid #ead8b6', borderRadius: 6, background: '#fff3e9', padding: 12, color: '#7a5310', fontSize: 11.5, lineHeight: 1.45 }}>
            Provider silence is recorded as “no response” and remains neutral. It does not assign responsibility.
          </p>
        ) : null}
        <BeforeYouConfirm
          objectSummary={`${investigation.id} · investigation transition`}
          valueSummary="No financial value changes."
          externalAction={externalAction}
          reversible="Append-only. A later transition may supersede this state; this record remains visible."
          appendOnly={appendedRecord}
        />
      </div>
    </Modal>
  );
}

export function CaseInvestigationsCard({
  caseId,
  canManage,
  onRecommendationRefresh: _onRecommendationRefresh,
  focusedInvestigationId,
}: {
  caseId: string;
  canManage: boolean;
  onRecommendationRefresh?: () => void;
  focusedInvestigationId?: string | null;
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

  useEffect(() => {
    if (!focusedInvestigationId || loading || !data) return;
    const target = document.getElementById(`investigation-${focusedInvestigationId}`);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  }, [data, focusedInvestigationId, loading]);

  return (
    <Card
      unstyled
      id="case-investigations"
      as="section"
      variant="panel"
      style={{ padding: 16 }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ margin: 0, color: '#64686d', fontSize: 10.5, fontWeight: 600 }}>
            Investigations
          </p>
          <h2 style={{ margin: '4px 0 0', color: '#1c1f23', fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>
            Resolve the material evidence gap
          </h2>
          <p style={{ maxWidth: 672, margin: '4px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.625 }}>
            Track targeted requests without blocking or deciding the customer outcome automatically.
          </p>
        </div>
        {canMutate ? (
          <Button
            size="sm"
            leadingIcon={<InvestigationIcon kind="plus" />}
            onClick={() => setRequestOpen(true)}
          >
            New request
          </Button>
        ) : null}
      </div>

      {message ? (
        <div role="status" style={{ marginTop: 12, border: '1px solid #e4e3e0', borderRadius: 6, background: '#f4f3f1', padding: 12, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
          {message}
        </div>
      ) : null}

      {loading && !data ? (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }} aria-label="Loading investigations">
          <Bone style={{ height: 64 }} />
          <Bone style={{ height: 64 }} />
        </div>
      ) : error ? (
        <div role="alert" style={{ marginTop: 16, border: '1px solid #edc6b5', borderRadius: 6, background: '#fdf0e6', padding: 12 }}>
          <p style={{ margin: 0, color: '#b0431a', fontSize: 13, lineHeight: '20px' }}>
            Investigation details are unavailable. No action has been taken.
          </p>
          <Button style={{ marginTop: 12 }} size="sm" variant="secondary" leadingIcon={<InvestigationIcon kind="refresh" />} onClick={reload}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {data?.aggregate.open ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 16 }}>
              {[
                ['Open', data.aggregate.open],
                ['Waiting', data.aggregate.waiting],
                ['Overdue', data.aggregate.overdue],
                ['Review', data.aggregate.awaitingReview],
              ].map(([label, value]) => (
                <Card key={String(label)} unstyled variant="muted" style={{ padding: 10 }}>
                  <p style={{ margin: 0, color: '#1c1f23', fontSize: 14, fontWeight: 600, lineHeight: '20px' }}>{value}</p>
                  <p style={{ margin: 0, color: '#6f6a63', fontSize: 10.5, lineHeight: '16px' }}>{label}</p>
                </Card>
              ))}
            </div>
          ) : null}

          {investigations.length === 0 ? (
            <Card unstyled variant="muted" style={{ marginTop: 16, padding: 16 }}>
              {data?.recommendation ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <InvestigationIcon kind="search" size={18} style={{ flexShrink: 0, marginTop: 2, color: '#9f4f08' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                      Recommended: ask {data.recommendation.targetName ?? targetLabel(data.recommendation.targetType)}
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#64686d', fontSize: 13, lineHeight: '20px' }}>
                      {data.recommendation.evidenceGap}
                    </p>
                    <p style={{ margin: '8px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
                      {data.recommendation.reason}
                    </p>
                    {canMutate ? (
                      <Button style={{ marginTop: 12 }} size="sm" onClick={() => setRequestOpen(true)}>
                        Review request draft
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, color: '#64686d', fontSize: 13, lineHeight: '20px' }}>
                  No investigation has been recorded for this case. Start one when a material factual question remains.
                </p>
              )}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {investigations.map((investigation) => {
                const overdue = isInvestigationOverdue(investigation);
                return (
                  <Card
                    unstyled
                    key={investigation.id}
                    id={`investigation-${investigation.id}`}
                    variant="muted"
                    style={{ scrollMarginTop: 96, padding: 14, outline: focusedInvestigationId === investigation.id ? '2px solid #9f4f08' : undefined, outlineOffset: focusedInvestigationId === investigation.id ? 2 : undefined }}
                    tabIndex={-1}
                    data-focused={focusedInvestigationId === investigation.id ? 'true' : undefined}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <StatusBadge
                            family="workflowStatus"
                            value={overdue ? 'overdue' : investigation.status}
                          />
                          {investigation.is_primary ? (
                            <span style={{ border: '1px solid #e4e3e0', borderRadius: 999, padding: '2px 8px', color: '#64686d', fontSize: 10.5, fontWeight: 500 }}>
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <p style={{ margin: '8px 0 0', color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                          {investigation.target_name ?? targetLabel(investigation.target_type)}
                        </p>
                        <p style={{ margin: '4px 0 0', color: '#64686d', fontSize: 13, lineHeight: '20px' }}>
                          {investigation.evidence_gap}
                        </p>
                      </div>
                      {investigation.due_at && investigation.status === 'waiting_response' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: overdue ? '#b0431a' : '#64686d', fontSize: 12, lineHeight: 1.45 }}>
                          <InvestigationIcon kind={overdue ? 'alert' : 'clock'} />
                          <time dateTime={investigation.due_at}>
                            {overdue ? 'Overdue ' : 'Due '}{formatDateTime(investigation.due_at)}
                          </time>
                        </div>
                      ) : null}
                    </div>

                    {investigation.response_summary ? (
                      <div style={{ marginTop: 12, border: '1px solid #c4dfe5', borderRadius: 6, background: '#edf6f8', padding: 12 }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#247388', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                          <InvestigationIcon kind="check" />
                          Latest response
                        </p>
                        <p style={{ margin: '4px 0 0', color: '#1c1f23', fontSize: 13, lineHeight: '20px' }}>
                          {investigation.response_summary}
                        </p>
                      </div>
                    ) : null}

                    {investigation.status === 'draft' ? (
                      <div style={{ marginTop: 12, border: '1px solid #e4e3e0', borderRadius: 6, background: '#fff', padding: 12 }}>
                        <p style={{ margin: 0, color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
                          {investigation.subject}
                        </p>
                        <p style={{ margin: '8px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.625, whiteSpace: 'pre-wrap' }}>
                          {investigation.request_body}
                        </p>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {investigation.status === 'draft' && canMutate ? (
                        <>
                          <Button size="sm" variant="secondary" leadingIcon={<InvestigationIcon kind="pencil" />} onClick={() => setEditing(investigation)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="secondary" leadingIcon={<InvestigationIcon kind="clipboard" />} onClick={() => void copyRequest(investigation)}>
                            Copy
                          </Button>
                          {emailReady && investigation.recipient ? (
                            <Button size="sm" leadingIcon={<InvestigationIcon kind="send" />} onClick={() => setAction({ kind: 'send-email', item: investigation })}>
                              Send email
                            </Button>
                          ) : null}
                          {investigation.external_url ? (
                            <Button size="sm" variant="secondary" leadingIcon={<InvestigationIcon kind="external" />} onClick={() => window.open(investigation.external_url!, '_blank', 'noopener,noreferrer')}>
                              Open portal
                            </Button>
                          ) : null}
                          <Button size="sm" variant={emailReady ? 'secondary' : 'primary'} leadingIcon={<InvestigationIcon kind="send" />} onClick={() => setAction({ kind: 'mark-sent', item: investigation })}>
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
            <p style={{ margin: '12px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
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
