'use client';

import { useRef, useState } from 'react';
import { BeforeYouConfirm, Button, Modal, Select, Textarea } from '@/components/ui';
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
      <div style={{ marginTop: 12, border: '1px solid #eae8e5', borderRadius: 6, background: '#f4f3f1', padding: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, color: '#1c1f23', fontSize: 11, fontWeight: 500, lineHeight: '16px' }}>
              Human photo finding
            </p>
            <p style={{ margin: '4px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>
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
          <p style={{ margin: '8px 0 0', color: '#64686d', fontSize: 11.5, lineHeight: 1.625 }}>
            {rationale}
          </p>
        ) : null}
        <p style={{ margin: '8px 0 0', color: '#6f6a63', fontSize: 10.5 }}>
          This records a human observation and refreshes the advisory recommendation. It does not decide the customer outcome.
        </p>
      </div>

      {open ? (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Record a delivery-photo finding"
          description="Compare the carrier photo with the order’s intended delivery context. Do not infer responsibility from provider silence."
          overlayId="delivery-photo-finding-modal"
          size="md"
          closeOnBackdrop={!busy}
          footer={(
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', gap: 8 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error ? (
              <p role="alert" style={{ margin: 0, border: '1px solid #edc6b5', borderRadius: 6, background: '#fdf0e6', padding: 12, color: '#b0431a', fontSize: 13, lineHeight: '20px' }}>
                {error}
              </p>
            ) : null}
            <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
              Finding
              <Select
                style={{ marginTop: 4 }}
                value={draftFinding}
                onChange={(event) => setDraftFinding(event.target.value as PhotoFinding)}
              >
                {Object.entries(FINDING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label style={{ display: 'block', color: '#40454a', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
              Rationale
              <Textarea
                style={{ minHeight: 112, marginTop: 4 }}
                maxLength={2000}
                value={draftRationale}
                onChange={(event) => setDraftRationale(event.target.value)}
                placeholder="State the visible facts: doorway, house number, parcel placement, or why the image is unclear."
              />
            </label>
            <BeforeYouConfirm
              objectSummary={`${caseId} · delivery-photo finding`}
              valueSummary="No financial value changes."
              externalAction="None. Nothing is sent to the customer or carrier."
              reversible="A later human finding supersedes this one; both remain in case history."
              appendOnly="A timestamped human finding and rationale. Unauth does not interpret the image or decide the customer outcome."
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
