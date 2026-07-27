'use client';

import { useRef, useState } from 'react';
import { Button, Modal, Select } from '@/components/ui';
import {
  mutateInvestigation,
  newInvestigationIdempotencyKey,
} from '@/lib/investigations/client';
import { formatDateTime } from '@/lib/utils/format';

type PhotoFinding = 'consistent' | 'inconsistent' | 'unclear';

const FINDING_LABELS: Record<PhotoFinding, string> = {
  consistent: 'Consistent with intended delivery',
  inconsistent: 'Inconsistent / possible wrong location',
  unclear: 'Unclear from the available photo',
};

export function DeliveryPhotoFinding({
  caseId,
  finding,
  rationale,
  recordedAt,
  canManage,
  onSaved,
}: {
  caseId: string;
  finding: PhotoFinding | null;
  rationale: string | null;
  recordedAt: string | null;
  canManage: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFinding, setDraftFinding] = useState<PhotoFinding>(finding ?? 'unclear');
  const [draftRationale, setDraftRationale] = useState(rationale ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(
    newInvestigationIdempotencyKey(`delivery-photo-finding:${caseId}`),
  );

  function openDialog() {
    keyRef.current = newInvestigationIdempotencyKey(
      `delivery-photo-finding:${caseId}`,
    );
    setDraftFinding(finding ?? 'unclear');
    setDraftRationale(rationale ?? '');
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (busy || draftRationale.trim().length < 5) return;
    setBusy(true);
    setError(null);
    const result = await mutateInvestigation(
      `/api/claims/${encodeURIComponent(caseId)}/delivery-photo-finding`,
      {
        finding: draftFinding,
        rationale: draftRationale.trim(),
      },
      keyRef.current,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    onSaved?.();
  }

  return (
    <>
      <div className="mt-3 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[var(--ua-text-primary)]">
              Human photo finding
            </p>
            <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
              {finding ? FINDING_LABELS[finding] : 'The delivery photo has not been interpreted yet.'}
              {recordedAt ? ` · ${formatDateTime(recordedAt)}` : ''}
            </p>
          </div>
          {canManage ? (
            <Button type="button" size="sm" variant="secondary" onClick={openDialog}>
              {finding ? 'Update finding' : 'Review photo'}
            </Button>
          ) : null}
        </div>
        {rationale ? (
          <p className="mt-2 text-xs leading-relaxed text-[var(--ua-text-secondary)]">
            {rationale}
          </p>
        ) : null}
        <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
          This records a human observation and refreshes the advisory recommendation. It does not decide the customer outcome.
        </p>
      </div>

      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Record delivery photo finding"
          description="Compare the carrier photo with the order’s intended delivery context. Do not infer responsibility from provider silence."
          size="md"
          closeOnBackdrop={!busy}
          footer={(
            <div className="flex w-full justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                loading={busy}
                disabled={busy || draftRationale.trim().length < 5}
              >
                Save finding
              </Button>
            </div>
          )}
        >
          <div className="space-y-4">
            {error ? (
              <p role="alert" className="rounded-md border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] p-3 text-sm text-[var(--ua-risk-critical)]">
                {error}
              </p>
            ) : null}
            <label className="block text-sm font-medium">
              Finding
              <Select
                className="mt-1"
                value={draftFinding}
                onChange={(event) => setDraftFinding(event.target.value as PhotoFinding)}
              >
                {Object.entries(FINDING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Rationale
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-2 text-sm"
                maxLength={2000}
                value={draftRationale}
                onChange={(event) => setDraftRationale(event.target.value)}
                placeholder="State the visible facts: doorway, house number, parcel placement, or why the image is unclear."
              />
            </label>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
