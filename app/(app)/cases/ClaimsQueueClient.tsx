"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/AppNavLink';
import { StatusPill } from "./claimsPageUi";
import {
  formatCurrencyNullable,
  formatDateAbsolute,
  formatMinorCurrencyNullable,
} from "@/lib/utils/format";
import { shortRef } from "@/lib/ui/displayRef";
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import {
  CLAIM_TYPE_LABELS,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from "./claimsPageData";
import { claimNextAction } from "./claimsPageLogic";

type Outcome = { decision: string; outcome: string; updated_at: string };
type BulkDecision = 'approved' | 'denied' | 'escalated' | 'partial_refund' | 'full_refund' | 'chargeback_disputed' | 'no_action';

function CloseGlyph() { return <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/></svg>; }
function ExpandGlyph() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M5.1 3H3v2.1M8.9 3H11v2.1M5.1 11H3V8.9M8.9 11H11V8.9"/></svg>; }
function LedgerGlyph() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2 12.2 4.6 7 7.2 1.8 4.6Z"/><path d="M1.8 7.5 7 10.1l5.2-2.6"/></svg>; }

type Props = {
  claims: ClaimRow[];
  outcomesRecord: Record<string, Outcome>;
  evidenceRecord: Record<string, EvidencePackageRow | null>;
  customersRecord: Record<string, CustomerProfileSummary>;
  currentUserId: string;
  initialSelectedCaseId?: string | null;
  page?: number;
  totalPages?: number;
  totalMatching?: number;
  previousHref?: string | null;
  nextHref?: string | null;
  basePath?: '/cases';
};

function customerDisplayName(
  customer: CustomerProfileSummary | null | undefined,
) {
  if (!customer) return "Identity pending";
  return customer.names?.[0] ?? customer.primary_email ?? "Identity pending";
}

function resolveInitialSelection(
  claims: ClaimRow[],
  initialSelectedCaseId?: string | null,
): string | null {
  if (initialSelectedCaseId && claims.some((c) => c.id === initialSelectedCaseId)) {
    return initialSelectedCaseId;
  }
  return claims[0]?.id ?? null;
}

function sourceSystemLabel(claim: ClaimRow): string {
  if (claim.source_ticket_ref) return `Helpdesk #${claim.source_ticket_ref}`;
  if (claim.shopify_order_id) return "Commerce order";
  return "Manual case";
}

function casePreviewPrimaryAction(claim: ClaimRow) {
  if (claim.status === "recovery_opened") {
    return { label: "Open recovery", hash: "case-recovery" };
  }
  if (claim.status === "decision_recorded") {
    return { label: "Review outcome", hash: "case-customer-action" };
  }
  if ([
    "evidence_needed",
    "awaiting_customer_evidence",
    "awaiting_carrier_response",
    "awaiting_3pl_response",
    "awaiting_supplier_response",
  ].includes(claim.status)) {
    return { label: "Review evidence", hash: "case-evidence" };
  }
  return { label: "Review case", hash: "case-customer-action" };
}

function missingEvidenceCopy(claim: ClaimRow): string {
  if (claim.status === "recovery_opened") {
    return "No generated evidence package is attached. The recorded decision and recovery activity remain in the case record.";
  }
  if (claim.status === "decision_recorded") {
    return "No generated evidence package is attached. The recorded customer decision remains in the case record.";
  }
  return "No generated evidence package is attached to this case.";
}

export function ClaimsQueueClient({
  claims,
  outcomesRecord,
  evidenceRecord,
  customersRecord,
  currentUserId,
  initialSelectedCaseId,
  page = 1,
  totalPages = 1,
  totalMatching = claims.length,
  previousHref = null,
  nextHref = null,
  basePath = '/cases',
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    resolveInitialSelection(claims, initialSelectedCaseId),
  );
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [focusedAction, setFocusedAction] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'assign' | 'snooze' | 'decision' | null>(null);
  const [bulkAssignment, setBulkAssignment] = useState<'assign_to_me' | 'unassign'>('assign_to_me');
  const [bulkDecision, setBulkDecision] = useState<BulkDecision>('no_action');
  const [bulkSnoozeUntil, setBulkSnoozeUntil] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousInitialSelection = useRef(initialSelectedCaseId);
  useEffect(() => {
    // URL-backed selection is an initial hint, not a permanent reopen command.
    // When the operator closes the preview, `selectedId` becomes null while
    // the server prop remains unchanged; do not immediately select the same
    // case again. A genuinely new URL selection is still adopted when the
    // parent receives a different initialSelectedCaseId.
    if (previousInitialSelection.current !== initialSelectedCaseId) {
      const priorInitialSelection = previousInitialSelection.current;
      previousInitialSelection.current = initialSelectedCaseId;
      const nextId = resolveInitialSelection(claims, initialSelectedCaseId)
        // If a URL-backed filter removed the previously selected row, keep
        // the operator in the queue by selecting the first remaining case.
        // This does not affect an explicit URL clear while the row still
        // exists, nor the close button (which leaves the prop unchanged).
        ?? (priorInitialSelection && selectedId && !claims.some((claim) => claim.id === selectedId)
          ? claims[0]?.id ?? null
          : null);
      setSelectedId(nextId);
      const url = new URL(window.location.href);
      if (nextId) url.searchParams.set('selected', nextId);
      else url.searchParams.delete('selected');
      replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
      return;
    }

    if (selectedId && claims.some((claim) => claim.id === selectedId)) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('selected') !== selectedId) {
        url.searchParams.set('selected', selectedId);
        replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }
    // Preserve continuity when a URL-backed selection is filtered out. The
    // registry still opens with no selection by default, but an operator who
    // was already inspecting a case should land on the first remaining row
    // instead of being left with a stale, invisible selection.
    const nextId = selectedId ? claims[0]?.id ?? null : null;
    setSelectedId(nextId);
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set('selected', nextId);
    else url.searchParams.delete('selected');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  }, [claims, initialSelectedCaseId, selectedId]);

  function selectClaim(id: string) {
    setSelectedId(id || null);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('selected', id);
    else url.searchParams.delete('selected');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  }

  function toggleBulkSelection(id: string) {
    setBulkSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function navigateToCase(id: string, action?: 'decision' | 'snooze' | 'request-evidence') {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('selected', id);
    const target = new URL(`${basePath}/${encodeURIComponent(id)}`, window.location.origin);
    target.searchParams.set('return', `${returnUrl.pathname}${returnUrl.search}`);
    if (action) target.searchParams.set('action', action);
    router.push(`${target.pathname}${target.search}${target.hash}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number, id: string) {
    const key = event.key;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(0, Math.min(claims.length - 1, index + (key === 'ArrowDown' ? 1 : -1)));
      setFocusedRowIndex(nextIndex);
      setFocusedAction(0);
      rowRefs.current[nextIndex]?.focus();
      selectClaim(claims[nextIndex]?.id ?? id);
      return;
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      setFocusedRowIndex(index);
      setFocusedAction((current) => Math.max(0, Math.min(2, current + (key === 'ArrowRight' ? 1 : -1))));
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      if (focusedAction > 0) navigateToCase(id, focusedAction === 1 ? 'decision' : 'request-evidence');
      else selectClaim(id);
      return;
    }
    if (key.toLowerCase() === 'r') {
      event.preventDefault();
      navigateToCase(id, 'decision');
      return;
    }
    if (key.toLowerCase() === 'h') {
      event.preventDefault();
      navigateToCase(id, 'snooze');
      return;
    }
    if (key.toLowerCase() === 'p') {
      event.preventDefault();
      navigateToCase(id, 'request-evidence');
      return;
    }
    if (key.toLowerCase() === 'x') {
      event.preventDefault();
      toggleBulkSelection(id);
      return;
    }
    if (key === '?' || (key === '/' && event.shiftKey)) {
      event.preventDefault();
      setHelpOpen(true);
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      if (helpOpen) setHelpOpen(false);
      else if (selectedId === id) selectClaim('');
      else setFocusedAction(0);
    }
  }

  async function confirmBulkAction() {
    if (!bulkConfirmAction || bulkSelectedIds.size === 0) return;
    if (bulkConfirmAction === 'snooze' && !bulkSnoozeUntil) {
      setBulkError('Choose the snooze deadline before confirming.');
      return;
    }
    if (bulkConfirmAction === 'decision') {
      const missingAmount = claims.find((claim) => bulkSelectedIds.has(claim.id) && (
        claim.amount_at_risk == null
        || !Number.isFinite(claim.amount_at_risk)
        || !claim.currency
        || !/^[A-Za-z]{3}$/.test(claim.currency)
      ));
      if (missingAmount) {
        setBulkError('Every selected case needs a known amount and ISO currency before a decision batch can be recorded.');
        return;
      }
    }
    setBulkBusy(true);
    setBulkError(null);
    const items = claims
      .filter((claim) => bulkSelectedIds.has(claim.id))
      .map((claim) => ({
        caseId: claim.id,
        expectedStateVersion: claim.state_version ?? 1,
        ...(bulkConfirmAction === 'assign' ? { assignment: bulkAssignment } : {}),
        ...(bulkConfirmAction === 'snooze' ? { snoozedUntil: new Date(bulkSnoozeUntil).toISOString() } : {}),
        ...(bulkConfirmAction === 'decision' ? {
          amountMinor: Math.round((claim.amount_at_risk ?? 0) * 100),
          currency: claim.currency?.toUpperCase(),
          decision: bulkDecision,
        } : {}),
      }));
    try {
      const response = await fetch('/api/claims/bulk', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `claims-bulk:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({ action: bulkConfirmAction, items }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Bulk action was not applied.');
      setBulkSelectedIds(new Set());
      setBulkConfirmAction(null);
      window.location.reload();
    } catch (cause) {
      setBulkError(cause instanceof Error ? cause.message : 'Bulk action was not applied.');
    } finally {
      setBulkBusy(false);
    }
  }

  const selected = selectedId
    ? (claims.find((c) => c.id === selectedId) ?? null)
    : null;
  const selectedOutcome = selectedId
    ? (outcomesRecord[selectedId] ?? null)
    : null;
  const selectedEvidence = selectedId
    ? (evidenceRecord[selectedId] ?? null)
    : null;
  const selectedCustomer = selected?.customer_id
    ? (customersRecord[selected.customer_id] ?? null)
    : null;
  const selectedOps = selected
    ? claimNextAction(selected, selectedOutcome, currentUserId)
    : null;
  return (
    <div data-reference-id="Cases-Clean" data-case-ledger data-preview-open={selected ? "true" : undefined} style={{ position: 'relative', height: '100%', minHeight: 0, display: 'block', overflow: 'visible' }}>
      {/* Left review list */}
      <div
        style={{ width: '100%', minWidth: 0, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 13, padding: 11, background: '#f4f3f1' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 10px' }}>
          <LedgerGlyph/><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em', color: '#64686d' }}>CASE LEDGER</span><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>GBP only · EUR cases excluded</span><button type="button" onClick={() => setHelpOpen(true)} aria-label="Show case keyboard help" style={{ border: 0, background: 'transparent', color: '#64686d', font: "400 10px/1 'IBM Plex Mono',monospace", cursor: 'pointer' }}>?</button>
        </div>
        <div role="grid" aria-label="Cases" style={{ flex: 1, minHeight: 0, background: '#ffffff', borderRadius: 10, boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div role="row" style={{ display: 'grid', gridTemplateColumns: '86px minmax(0,1fr) 128px 132px 84px', gap: 10, padding: '9px 14px', borderBottom: '1px solid #eae8e5', background: '#ffffff' }}>
          {['CASE','CUSTOMER · REASON','STATUS','NEXT ACTION','AT RISK'].map((label) => <span key={label} role="columnheader" style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em', color: '#64686d', textAlign: label === 'AT RISK' ? 'right' : 'left' }}>{label}</span>)}
        </div>
        <div role="rowgroup" style={{ minHeight: 0, overflowY: 'auto' }}>
        {claims.map((c, index) => {
          const customer = c.customer_id
            ? (customersRecord[c.customer_id] ?? null)
            : null;
          const isSelected = c.id === selectedId;
          const ops = claimNextAction(
            c,
            outcomesRecord[c.id] ?? null,
            currentUserId,
          );
          return (
            <button
              key={c.id}
              type="button"
              data-case-id={c.id}
              onClick={() => selectClaim(c.id)}
              onFocus={() => setFocusedRowIndex(index)}
              onKeyDown={(event) => handleRowKeyDown(event, index, c.id)}
              ref={(element) => { rowRefs.current[index] = element; }}
              aria-selected={isSelected}
              aria-controls="payout-case-preview"
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter R H P X ? Escape"
              data-action-focus={focusedRowIndex === index ? String(focusedAction) : undefined}
              data-selected={isSelected || undefined}
              role="row"
              style={{ width: '100%', display: 'grid', gridTemplateColumns: '86px minmax(0,1fr) 128px 132px 84px', alignItems: 'center', gap: 10, padding: '11px 14px', border: 0, borderTop: index ? '1px solid #f4f2ef' : 0, background: isSelected ? '#fff3e9' : '#fff', boxShadow: isSelected ? 'inset 2px 0 0 #ff7a30' : 'none', color: '#1c1f23', textAlign: 'left', cursor: 'pointer' }}
            >
              <span role="gridcell" style={{ font: "400 11px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{shortRef(c.id, c.id)}</span>
              <span role="gridcell" style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "500 12.5px/1.3 'Inter',sans-serif" }}>{customerDisplayName(customer)} · {(CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type).toLowerCase()}</strong><small style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, color: '#64686d', font: "400 11px/1.4 'Inter',sans-serif" }}>{shortRef(c.order_ref ?? c.shopify_order_id, c.id)} · {sourceSystemLabel(c)}</small></span>
              <span role="gridcell" style={{ display: 'flex' }}><StatusPill status={c.status}/></span>
              <span role="gridcell" style={{ color: '#40454a', font: "400 11.5px/1.35 'Inter',sans-serif" }}>{ops.nextActionLabel}</span>
              <span role="gridcell" style={{ textAlign: 'right', font: "400 11.5px/1 'IBM Plex Mono',monospace" }}>{formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined) ?? 'Unavailable'}</span>
            </button>
          );
        })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: '1px solid #eae8e5', background: '#ffffff' }}>
          <span style={{ font: "400 10.5px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>{claims.length} of {totalMatching} in this queue</span>
          <span style={{ flex: 1 }}/>
          {previousHref ? <Link href={previousHref} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d', textDecoration: 'none' }}>Previous</Link> : <span aria-disabled="true" style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "400 11.5px/1 'Inter',sans-serif", color: '#a7abad' }}>Previous</span>}
          {nextHref ? <Link href={nextHref} style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "500 11.5px/1 'Inter',sans-serif", color: '#1c1f23', textDecoration: 'none' }}>Next</Link> : <span aria-disabled="true" style={{ padding: '5px 9px', borderRadius: 7, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.09)', font: "500 11.5px/1 'Inter',sans-serif", color: '#a7abad' }}>Next</span>}
          <span data-page-number={page} data-page-count={totalPages} style={{ display: 'none' }}>{page} of {totalPages}</span>
        </div>
        </div>
      </div>

      {helpOpen ? (
        <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setHelpOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(28,27,25,.25)' }}>
          <div role="dialog" aria-modal="true" aria-label="Case keyboard shortcuts" style={{ width: '100%', maxWidth: 420, borderRadius: 10, background: '#fff', boxShadow: '0 24px 60px rgba(28,27,25,.22)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}><div><p style={{ margin: 0, font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>Keyboard</p><h2 style={{ margin: '4px 0 0', font: "500 14px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>Case desk shortcuts</h2></div><button type="button" onClick={() => setHelpOpen(false)} aria-label="Close keyboard help" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}><CloseGlyph/></button></div>
            <dl style={{ display: 'grid', gap: 8, margin: '16px 0 0', font: "400 12px/1.4 'Inter',sans-serif", color: '#40454a' }}><div><dt style={{ display: 'inline' }}><kbd>↑ ↓</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Move between cases</dd></div><div><dt style={{ display: 'inline' }}><kbd>← →</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Move between row actions</dd></div><div><dt style={{ display: 'inline' }}><kbd>Enter</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Open the selected case or action</dd></div><div><dt style={{ display: 'inline' }}><kbd>R</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Open merchant decision confirmation</dd></div><div><dt style={{ display: 'inline' }}><kbd>H</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Open snooze/hold</dd></div><div><dt style={{ display: 'inline' }}><kbd>P</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Open evidence request workflow</dd></div><div><dt style={{ display: 'inline' }}><kbd>X</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Toggle bulk selection</dd></div><div><dt style={{ display: 'inline' }}><kbd>⌘K</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Open the command palette</dd></div><div><dt style={{ display: 'inline' }}><kbd>Esc</kbd></dt><dd style={{ display: 'inline', margin: '0 0 0 10px' }}>Close help or preview</dd></div></dl>
          </div>
        </div>
      ) : null}

      {bulkConfirmAction ? (
        <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setBulkConfirmAction(null); }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(28,27,25,.25)' }}>
          <div role="dialog" aria-modal="true" aria-label="Confirm bulk case action" style={{ maxHeight: 'calc(100dvh - 2rem)', width: '100%', maxWidth: 560, overflowY: 'auto', borderRadius: 10, background: '#fff', boxShadow: '0 24px 60px rgba(28,27,25,.22)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}><div><p style={{ margin: 0, font: "400 10.5px/1.4 'Inter',sans-serif", color: '#64686d' }}>Review before writing</p><h2 style={{ margin: '4px 0 0', font: "500 14px/1.35 'Inter',sans-serif", color: '#1c1f23' }}>{bulkConfirmAction === 'assign' ? 'Assign selected cases' : bulkConfirmAction === 'snooze' ? 'Snooze selected cases' : 'Record decisions for selected cases'}</h2></div><button type="button" onClick={() => setBulkConfirmAction(null)} disabled={bulkBusy} aria-label="Close bulk confirmation" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}><CloseGlyph/></button></div>
            <p style={{ margin: '8px 0 0', font: "400 11.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>Every selected case is validated with its expected state version before any item is changed. A stale version, permission failure, or invalid case rejects the batch. A decision records merchant intent only; it does not issue a refund or contact a provider.</p>
            {bulkConfirmAction === 'assign' ? <label style={{ display: 'grid', gap: 4, marginTop: 16, font: "400 12px/1.4 'Inter',sans-serif" }}><span style={{ font: "500 11px/1.4 'Inter',sans-serif", color: '#64686d' }}>Assignment applied to every selected case</span><select value={bulkAssignment} onChange={(event) => { setBulkAssignment(event.target.value as 'assign_to_me' | 'unassign'); setBulkError(null); }} style={{ minHeight: 36, border: '1px solid #e4e3e0', borderRadius: 8, background: '#fff', padding: '0 12px', color: '#1c1f23' }}><option value="assign_to_me">Assign to me</option><option value="unassign">Leave unassigned</option></select><span style={{ font: "400 11.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>This uses the same assignment transition and expected state version as the single-case action.</span></label> : null}
            {bulkConfirmAction === 'snooze' ? <label style={{ display: 'grid', gap: 4, marginTop: 16, font: "400 12px/1.4 'Inter',sans-serif" }}><span style={{ font: "500 11px/1.4 'Inter',sans-serif", color: '#64686d' }}>Snooze until</span><input type="datetime-local" value={bulkSnoozeUntil} onChange={(event) => { setBulkSnoozeUntil(event.target.value); setBulkError(null); }} required aria-describedby="bulk-snooze-help"/><span id="bulk-snooze-help" style={{ font: "400 11.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>The exact deadline is stored on every case and remains visible in the queue.</span></label> : null}
            {bulkConfirmAction === 'decision' ? <label style={{ display: 'grid', gap: 4, marginTop: 16, font: "400 12px/1.4 'Inter',sans-serif" }}><span style={{ font: "500 11px/1.4 'Inter',sans-serif", color: '#64686d' }}>Decision applied to every selected case</span><select value={bulkDecision} onChange={(event) => { setBulkDecision(event.target.value as BulkDecision); setBulkError(null); }} style={{ minHeight: 36, border: '1px solid #e4e3e0', borderRadius: 8, background: '#fff', padding: '0 12px', color: '#1c1f23' }}><option value="no_action">No further action</option><option value="approved">Resolved in customer favour</option><option value="denied">Closed without payout</option><option value="escalated">Escalated for review</option><option value="partial_refund">Partial resolution</option><option value="full_refund">Full resolution</option><option value="chargeback_disputed">Chargeback disputed</option></select><span style={{ font: "400 11.5px/1.45 'Inter',sans-serif", color: '#64686d' }}>Each row uses its rendered value and currency as the explicit decision amount.</span></label> : null}
            <ul style={{ display: 'grid', gap: 8, margin: '16px 0 0', padding: 0, listStyle: 'none' }} aria-label="Selected cases and exact values">{claims.filter((claim) => bulkSelectedIds.has(claim.id)).map((claim) => <li key={claim.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #eae8e5', paddingBottom: 8, font: "400 12px/1.4 'IBM Plex Mono',monospace" }}><span>{shortRef(claim.id, claim.id)}</span><span>{formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? 'Unavailable'}</span></li>)}</ul>
            {bulkError ? <p style={{ margin: '12px 0 0', font: "400 11.5px/1.45 'Inter',sans-serif", color: '#b0431a' }} role="alert">{bulkError}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}><button type="button" onClick={() => setBulkConfirmAction(null)} disabled={bulkBusy} style={{ border: '1px solid #e4e3e0', borderRadius: 7, background: '#fff', padding: '8px 12px', color: '#64686d', font: "500 11px/1.4 'Inter',sans-serif", cursor: 'pointer' }}>Cancel</button><button type="button" onClick={() => void confirmBulkAction()} disabled={bulkBusy} style={{ border: 0, borderRadius: 7, background: '#1c1f23', padding: '8px 12px', color: '#fff', font: "500 11px/1.4 'Inter',sans-serif", cursor: 'pointer' }}>{bulkBusy ? 'Applying…' : 'Confirm batch'}</button></div>
          </div>
        </div>
      ) : null}

      {/* Row selection stays in context. Expand opens the canonical full case page. */}
      {selected && selectedOps ? (
        <aside
          id="payout-case-preview"
          role="region"
          aria-label="Selected case preview"
          data-overlay-id="case-context-drawer"
          data-signal-rail="true"
          style={{ position: 'absolute', top: 0, left: 'calc(100% + 16px)', width: 340, height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden', borderRadius: 12, background: '#fff', boxShadow: '0 18px 40px rgba(28,27,25,.16),0 0 0 1px rgba(28,27,25,.08)' }}
        >
          <ClaimDetailPanel
            claim={selected}
            ops={selectedOps}
            outcome={selectedOutcome}
            evidence={selectedEvidence}
            customer={selectedCustomer}
            basePath={basePath}
            onClose={() => selectClaim('')}
          />
        </aside>
      ) : null}

    </div>
  );
}

function ClaimDetailPanel({
  claim,
  ops,
  outcome,
  evidence,
  customer,
  basePath,
  onClose,
}: {
  claim: ClaimRow;
  ops: ReturnType<typeof claimNextAction>;
  outcome: Outcome | null;
  evidence: EvidencePackageRow | null;
  customer: CustomerProfileSummary | null;
  basePath: '/cases';
  onClose: () => void;
}) {
  const orderRef = shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id);
  const caseRef = shortRef(claim.id, claim.id);
  const primaryAction = casePreviewPrimaryAction(claim);
  const financialClaim = claim as ClaimRow & { recoverable_minor?: number | null; recoverable_state?: 'known' | 'unavailable' };
  const recoverable = financialClaim.recoverable_state === 'known'
    ? formatMinorCurrencyNullable(financialClaim.recoverable_minor ?? null, claim.currency)
    : 'Unavailable';
  const orderDate = claim.submitted_at ? formatDateAbsolute(new Date(claim.submitted_at)) : 'date unavailable';
  const metaRows = [
    ['Order', `${orderRef} · ${orderDate}`],
    ['Shipment', 'Unavailable · source not linked'],
    ['Ticket', claim.source_ticket_ref ? `${claim.source_ticket_ref} · Gorgias` : 'Unavailable · support source not linked'],
    ['Next action', ops.nextActionLabel],
  ];

  return (
    <div style={{ height: '100%', minHeight: 0, padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto', color: '#1c1f23' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 6, color: '#6f6a63', font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>{caseRef} · CONTEXT</div>
          <h2 style={{ margin: 0, font: "500 14.5px/1.35 'Inter',sans-serif" }}>{customerDisplayName(customer)} · {(CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type).toLowerCase()}</h2>
        </div>
        <Link href={basePath + '/' + claim.id + '?return=' + encodeURIComponent(basePath + '?selected=' + claim.id)} aria-label="Expand case" title="Expand case" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 7, color: '#6f6a63' }}><ExpandGlyph/></Link>
        <button type="button" onClick={onClose} aria-label="Close case preview" title="Close case preview" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', padding: 0, border: 0, borderRadius: 7, background: 'transparent', color: '#6f6a63' }}><CloseGlyph/></button>
      </header>

      <div style={{ display: 'flex', gap: 8 }}>
        {[['AT RISK', formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? 'Unavailable'], ['RECOVERABLE', recoverable]].map(([label,value]) => (
          <div key={label} style={{ flex: 1, minWidth: 0, borderRadius: 9, padding: '10px 11px', background: '#f4f3f1' }}>
            <div style={{ marginBottom: 6, color: '#6f6a63', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>{label}</div>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 14px/1 'IBM Plex Mono',monospace" }}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {metaRows.map(([label,value]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ width: 88, flex: '0 0 88px', color: '#6f6a63', font: "400 11px/1.4 'Inter',sans-serif" }}>{label}</span><span style={{ flex: 1, color: label === 'Next action' ? '#40454a' : '#9f4f08', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{value}</span></div>)}
      </div>

      <section style={{ borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.08)', padding: '11px 12px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#64686d', font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em' }}>TIMELINE</h3>
        {[
          [claim.updated_at, ops.evidenceStatus],
          [evidence?.generated_at ?? null, evidence ? 'Evidence package generated · ' + evidence.reference_number : missingEvidenceCopy(claim)],
          [outcome?.updated_at ?? null, outcome ? 'Merchant decision recorded' : 'Merchant decision not recorded'],
        ].map(([date,label], position) => <div key={position} style={{ display: 'flex', gap: 9, paddingTop: position ? 9 : 0 }}><span style={{ width: 6, height: 6, marginTop: 4, flex: '0 0 6px', borderRadius: '50%', background: position === 0 ? '#ff7a30' : '#d4cfc8' }}/><div style={{ minWidth: 0 }}><div style={{ font: "400 11.5px/1.35 'Inter',sans-serif" }}>{label}</div><div style={{ marginTop: 2, color: '#6f6a63', font: "400 10px/1.3 'IBM Plex Mono',monospace" }}>{date ? formatDateAbsolute(new Date(date)) : 'No recorded timestamp'}</div></div></div>)}
      </section>

      <div style={{ borderRadius: 9, padding: '10px 11px', display: 'flex', gap: 8, background: '#fff3e9', boxShadow: 'inset 0 0 0 1px rgba(201,138,26,.22)' }}>
        <span style={{ width: 6, height: 6, marginTop: 4, flex: '0 0 6px', borderRadius: '50%', background: '#7a5310' }}/>
        <span style={{ color: '#7a5310', font: "400 11px/1.5 'Inter',sans-serif" }}>{ops.reviewState}</span>
      </div>

      <section style={{ borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.08)', padding: '11px 12px' }}>
        <h3 style={{ margin: '0 0 9px', color: '#64686d', font: "400 10px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em' }}>CUSTOMER CONTEXT</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Lifetime spend', 'Unavailable'], ['Orders', 'Unavailable'], ['Prior cases', 'Unavailable'], ['Prior outcomes', customer ? `${customerDisplayName(customer)} · outcome history unavailable` : 'Unavailable']].map(([label, value]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ flex: 1, color: '#40454a', font: "400 11.5px/1.3 'Inter',sans-serif" }}>{label}</span><span style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 11px/1 'IBM Plex Mono',monospace" }}>{value}</span></div>)}
        </div>
      </section>

      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 7 }}><Link href={basePath + '/' + claim.id + '#' + primaryAction.hash} style={{ flex: 1, minHeight: 34, display: 'grid', placeItems: 'center', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Open case review</Link><button type="button" disabled aria-label="Assign case unavailable in this context" style={{ minHeight: 34, padding: '0 12px', border: 0, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', background: '#fff', color: '#a7abad', font: "500 12.5px/1 'Inter',sans-serif", cursor: 'not-allowed' }}>Assign</button></div>
    </div>
  );
}
