'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useScreenshotMode } from '@/components/connections/ConnectionStateContext';
import { screenshotCaseContext } from '@/lib/demo/screenshotAccount';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { useRouter } from 'next/navigation';
import { SuppliedVisualBody } from '@/components/visual-authority/generated/Cases-Clean';
import { consumeSuppliedText } from '@/components/visual-authority/bindSuppliedTree';
import { PAYOUT_CASE_STATUS_LABELS, type PayoutCaseStatus } from '@/lib/payouts/types';
import { shortRef } from '@/lib/ui/displayRef';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import { formatCurrencyNullable, formatDateAbsolute, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { ManualCaseDialog } from './ManualCaseDialog';
import { CasesQueueTabs } from './CasesQueueTabs';
import { CasesCompactFilters } from './CasesCompactFilters';
import { CasesFlowChart, casesFlowWindow } from './CasesFlowChart';
import { claimNextAction } from './claimsPageLogic';
import {
  CLAIM_TYPE_LABELS,
  type ClaimRow,
  type CustomerProfileSummary,
  type EvidencePackageRow,
} from './claimsPageData';
import type { ClaimsPageViewProps } from './ClaimsPageView';

type Outcome = { decision: string; outcome: string; updated_at: string };
type ClickHandler = () => void;
type FinancialClaim = ClaimRow & { recoverable_minor?: number | null; recoverable_state?: 'known' | 'unavailable' };

const SOURCE_ROWS = [
  ['CASE-4187', 'Maya Cheng · not delivered', '#AS-88214 · UPS · ticket 51204', 'DECISION DUE', 'Record decision', '£4,180.00'],
  ['CASE-4193', 'Jonah Baptiste · not delivered', '#AS-88301 · UPS · Gorgias thread stale 3d', 'EVIDENCE GAP', 'Request evidence', '£248.00'],
  ['CASE-4191', 'Alina Sorescu · damaged on arrival', '#AS-88296 · Evri · photo attached', 'PHOTO HELD', 'Assess damage', '£132.50'],
  ['CASE-4186', 'Hannah Boyle · return never scanned', '#AS-88277 · Royal Mail · no transit scan', 'NO SOURCE', 'Write off or wait', '£226.00'],
  ['CASE-4188', 'Théo Marchand · wrong item picked', '#AS-88289 · ShipBob pick error confirmed', 'WITH 3PL', 'Recharge ShipBob', '£96.00'],
  ['CASE-4181', 'Hannah Boyle · chargeback', '#AS-88189 · Visa · evidence due 8 Sep', 'EVIDENCE DUE', 'Build the pack', '£333.00'],
  ['CASE-4176', 'Alina Sorescu · damaged in transit', '#AS-88176 · Evri paid · REC-1188', 'RECONCILED', 'Nothing to do', '£224.40'],
  ['CASE-4171', 'Théo Marchand · wrong item picked', '#AS-88190 · ShipBob credit unmatched', 'UNMATCHED', 'Match the credit', '£188.00'],
  ['CASE-4165', 'Priya Nandal · not delivered', '#AS-88041 · RM · window closed', 'WINDOW CLOSED', 'Write off', '£486.00'],
  ['CASE-4159', 'Jonah Baptiste · carrier chase open', '#AS-87996 · UPS · chased 1 Sep, no reply', 'WAITING', 'Chase again', '£74.20'],
] as const;

function compactText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return '';
  return Children.toArray(node.props.children).map(compactText).join(' ').replace(/\s+/g, ' ').trim();
}

function customerDisplayName(customer: CustomerProfileSummary | null | undefined): string {
  if (!customer) return 'Identity pending';
  return customer.names?.[0] ?? customer.primary_email ?? 'Identity pending';
}

function sourceSystemLabel(claim: ClaimRow): string {
  if (claim.source_ticket_ref) return `Helpdesk #${claim.source_ticket_ref}`;
  if (claim.shopify_order_id) return 'Commerce order';
  return 'Manual case';
}

function statusLabel(status: string): string {
  return (PAYOUT_CASE_STATUS_LABELS[status as PayoutCaseStatus]
    ?? status.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase())).toUpperCase();
}

function claimLabel(claim: ClaimRow, customer: CustomerProfileSummary | null | undefined): string {
  return `${customerDisplayName(customer)} · ${(CLAIM_TYPE_LABELS[claim.claim_type] ?? claim.claim_type).toLowerCase()}`;
}

function claimOrderLabel(claim: ClaimRow): string {
  return `${shortRef(claim.order_ref ?? claim.shopify_order_id, claim.id)} · ${sourceSystemLabel(claim)}`;
}

function displayMoney(claim: ClaimRow): string {
  return formatCurrencyNullable(claim.amount_at_risk, claim.currency ?? undefined) ?? 'Unavailable';
}

function isSourceRow(node: ReactElement<{ style?: CSSProperties }>, visibleText: string): number {
  if (node.props.style?.gridTemplateColumns !== '86px 1fr 128px 132px 84px') return -1;
  return SOURCE_ROWS.findIndex(([caseRef]) => visibleText.startsWith(caseRef));
}

function isCloseGlyph(node: ReactElement<{ children?: ReactNode }>): boolean {
  if (node.type !== 'svg') return false;
  return Children.toArray(node.props.children).some((child) => (
    isValidElement<{ d?: string }>(child) && child.props.d === 'M3.5 3.5l7 7M10.5 3.5l-7 7'
  ));
}

function bindTree(
  node: ReactNode,
  replaceText: (value: string) => string,
  actions: ReadonlyMap<string, ClickHandler>,
  claims: readonly ClaimRow[],
  selectedId: string | null,
  selectClaim: (id: string | null) => void,
  inheritedClaim: ClaimRow | null = null,
  ancestorHasAction = false,
  renderRows?: () => ReactNode,
  rowOverride?: ClaimRow,
  filterControls?: ReactNode,
  flowChart?: ReactNode,
  queueTabs?: ReactNode,
): ReactNode {
  if (typeof node === 'string') return replaceText(node);
  if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return node;

  const visibleText = compactText(node);
  if (queueTabs && node.type === 'div' && visibleText === 'Needs action Waiting Ready to close All') return queueTabs;
  if (filterControls && node.type === 'div' && visibleText === 'Type: all') return filterControls;
  if (filterControls && node.type === 'div' && visibleText === 'Owner: anyone') return null;
  if (flowChart && node.props.style?.height === '30px' && node.props.style?.gap === '2px') return flowChart;
  const sourceRowIndex = isSourceRow(node, visibleText);
  if (sourceRowIndex >= 0 && renderRows) return sourceRowIndex === 0 ? renderRows() : null;
  if (sourceRowIndex >= 0 && !rowOverride && !claims[sourceRowIndex]) return null;
  if (!ancestorHasAction && isCloseGlyph(node)) {
    return <button
      type="button"
      aria-label="Close case preview"
      onClick={() => selectClaim(null)}
      style={{ width: 32, height: 32, flex: 'none', display: 'grid', placeItems: 'center', border: '1px solid #e4e3e0', borderRadius: 8, background: '#fff', color: '#64686d', cursor: 'pointer' }}
    >{cloneElement(node as ReactElement<Record<string, unknown>>, { 'aria-hidden': true, role: undefined, tabIndex: undefined, style: { display: 'block' } })}</button>;
  }

  const sourceProps: Record<string, unknown> = {};
  const rowClaim = sourceRowIndex >= 0 ? rowOverride ?? claims[sourceRowIndex] : null;
  const action = ancestorHasAction ? undefined : actions.get(visibleText);
  const item = rowClaim ?? inheritedClaim;

  if (rowClaim) {
    const selected = rowClaim.id === selectedId;
    sourceProps.role = 'row';
    sourceProps.tabIndex = 0;
    sourceProps['aria-selected'] = selected;
    sourceProps['data-case-id'] = rowClaim.id;
    sourceProps.onClick = () => selectClaim(rowClaim.id);
    sourceProps.onKeyDown = (event: { key: string; target: unknown; currentTarget: unknown; preventDefault: () => void }) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectClaim(rowClaim.id);
    };
    {
      sourceProps.style = {
        ...node.props.style,
        minHeight: 54,
        flex: 'none',
        background: selected ? '#fff3e9' : '#ffffff',
        boxShadow: selected ? 'inset 2px 0 0 #ff7a30' : undefined,
      };
    }
  } else if (item && node.type === 'a') {
    sourceProps.href = `/cases/${encodeURIComponent(item.id)}`;
    sourceProps.onClick = (event: { stopPropagation: () => void }) => event.stopPropagation();
  } else if (action) {
    const handler = action;
    sourceProps.onClick = (event: { preventDefault?: () => void }) => {
      event.preventDefault?.();
      handler();
    };
    sourceProps.role = node.type === 'a' ? undefined : 'button';
    sourceProps.tabIndex = node.type === 'a' ? undefined : 0;
    sourceProps.onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handler();
    };
  }

  if (node.type === 'a' && visibleText === 'Open case review') {
    sourceProps.href = selectedId ? `/cases/${encodeURIComponent(selectedId)}` : undefined;
    if (!selectedId) sourceProps['aria-disabled'] = true;
  }

  if (typeof node.type === 'string' && visibleText.includes('OPENED AGAINST CLOSED') && visibleText.includes('CASE LEDGER')) {
    sourceProps['data-surface-id'] = 'cases-registry';
    sourceProps['data-reference-id'] = 'Cases-Clean';
    sourceProps['data-data-resolved'] = 'true';
    sourceProps['data-route-state'] = 'loaded';
    sourceProps['data-provenance'] = 'canonical-cases-read-model';
  }

  // The supplied 17px mono slot assumes a short example amount. Runtime money
  // and its partial-coverage qualifier need a readable measure at 1024–1440px.
  if (visibleText === '£10,006.00' || visibleText === '£4,602.76') {
    sourceProps.style = {
      ...node.props.style,
      font: "400 14px/1.35 'Inter',sans-serif",
      color: '#1c1f23',
      overflowWrap: 'anywhere',
    };
  }
  if (visibleText.includes('£4,602.76') && visibleText.includes('est. at 46.0% recovery rate')) {
    sourceProps.style = { ...node.props.style, flexWrap: 'wrap' };
  }

  const isCasesContentFrame = node.props.style?.padding === '16px 378px 20px 22px';
  if (isCasesContentFrame && !selectedId) {
    sourceProps.style = { ...node.props.style, padding: '16px 22px 20px 22px' };
  }

  const isCaseLedger = node.props.style?.display === 'flex'
    && node.props.style?.flexDirection === 'column'
    && node.props.style?.flex === '1'
    && node.props.style?.minHeight === '0'
    && node.props.style?.overflow === 'hidden'
    && visibleText.includes('CUSTOMER · REASON')
    && visibleText.includes('NEXT ACTION');
  if (isCaseLedger) {
    sourceProps.style = { ...node.props.style, overflowY: 'auto', overscrollBehavior: 'contain' };
    sourceProps.role = 'table';
    sourceProps['aria-label'] = 'Cases';
  }

  const isCaseLedgerFooter = node.props.style?.display === 'flex'
    && node.props.style?.padding === '10px 14px'
    && visibleText.includes('10 of 23 in this queue');
  if (isCaseLedgerFooter) sourceProps.role = 'row';

  if (node.props.style?.position === 'absolute' && node.props.style?.width === '340px') {
    if (!selectedId) return null;
    sourceProps.style = { ...node.props.style, overflowY: 'auto', overscrollBehavior: 'contain' };
  }

  if (item && node.props.style?.whiteSpace === 'nowrap') {
    sourceProps.style = { ...node.props.style, whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', overflowWrap: 'anywhere' };
  }

  const isHeaderRow = sourceRowIndex < 0
    && node.props.style?.gridTemplateColumns === '86px 1fr 128px 132px 84px'
    && visibleText.toUpperCase().includes('CASE')
    && visibleText.toUpperCase().includes('CUSTOMER');
  if (isHeaderRow) sourceProps.role = 'row';

  const children = Children.map(node.props.children, (child) => (
    bindTree(child, replaceText, actions, claims, selectedId, selectClaim, item,
      ancestorHasAction || (!rowClaim && Boolean(sourceProps.onClick)), renderRows, undefined, filterControls, flowChart, queueTabs)
  ));
  if (isCaseLedgerFooter) {
    const cells = Children.toArray(children).map((child, index) => isValidElement(child)
      ? <div key={child.key ?? `footer-cell-${index}`} role="cell" style={{ display: 'contents' }}>{child}</div>
      : child);
    return cloneElement(node as ReactElement, sourceProps, cells);
  }
  if (rowClaim || isHeaderRow) {
    const cells = Children.toArray(children).map((child) => isValidElement(child)
      ? cloneElement(child as ReactElement<Record<string, unknown>>, { role: isHeaderRow ? 'columnheader' : 'cell' })
      : child);
    return cloneElement(node as ReactElement, sourceProps, cells);
  }
  return cloneElement(node as ReactElement, sourceProps, children);
}

function addReplacement(queues: Map<string, string[]>, source: string, replacement: string): void {
  const queue = queues.get(source) ?? [];
  queue.push(replacement);
  queues.set(source, queue);
}

export function ExactClaimsPageView(props: ClaimsPageViewProps) {
  const {
    connectionState,
    queueCounts,
    coverageByMetric,
    casesSummary,
    casesFlow,
    resultText,
    filterTabs,
    claims,
    listView,
    latestOutcomeByClaimId,
    evidenceByClaimId,
    customerById,
    currentUserId,
    initialSelectedCaseId,
    recoveryMetricRows,
    recoveryMetricCoverage,
    page,
    totalPages,
    totalMatching,
    basePath,
    sp,
  } = props;
  const screenshot = useScreenshotMode();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(() => (
    initialSelectedCaseId && claims.some((claim) => claim.id === initialSelectedCaseId)
      ? initialSelectedCaseId
      : null
  ));
  const dismissedSelection = useRef(false);
  const previousInitialSelection = useRef(initialSelectedCaseId);

  useEffect(() => {
    // Keep the supplied renderer aligned with ClaimsQueueClient: a URL
    // selection is an initial hint, explicit close is local dismissal, and a
    // filtered-out selected row keeps continuity with the first remaining row.
    if (previousInitialSelection.current !== initialSelectedCaseId) {
      const priorInitialSelection = previousInitialSelection.current;
      previousInitialSelection.current = initialSelectedCaseId;
      const nextId = initialSelectedCaseId && claims.some((claim) => claim.id === initialSelectedCaseId)
        ? initialSelectedCaseId
        : priorInitialSelection && selectedId && !claims.some((claim) => claim.id === selectedId)
          ? claims[0]?.id ?? null
          : null;
      setSelectedId(nextId);
      const url = new URL(window.location.href);
      if (nextId) url.searchParams.set('selected', nextId);
      else url.searchParams.delete('selected');
      replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
      return;
    }

    if (selectedId && claims.some((claim) => claim.id === selectedId)) return;
    if (dismissedSelection.current) return;
    const nextId = selectedId ? claims[0]?.id ?? null : null;
    setSelectedId(nextId);
    const url = new URL(window.location.href);
    if (nextId) url.searchParams.set('selected', nextId);
    else url.searchParams.delete('selected');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  }, [claims, initialSelectedCaseId, selectedId]);

  const selectClaim = (id: string | null) => {
    dismissedSelection.current = id === null;
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('selected', id);
    else url.searchParams.delete('selected');
    replaceHistoryUrlIfChanged(`${url.pathname}${url.search}${url.hash}`);
  };

  const selected = selectedId ? claims.find((claim) => claim.id === selectedId) ?? null : null;
  const selectedCustomer = selected?.customer_id ? customerById.get(selected.customer_id) ?? null : null;
  const selectedOutcome: Outcome | null = selectedId ? latestOutcomeByClaimId.get(selectedId) ?? null : null;
  const selectedEvidence: EvidencePackageRow | null = selectedId ? evidenceByClaimId.get(selectedId) ?? null : null;
  const selectedOps = selected ? claimNextAction(selected, selectedOutcome, currentUserId) : null;

  const bound = useMemo(() => {
    const queues = new Map<string, string[]>();
    const currentViewCoverage = coverageByMetric.total;
    const toolbarResult = listView.kind === 'active' && currentViewCoverage === 'complete'
      ? `${formatNumber(queueCounts.active)} of ${formatNumber(queueCounts.total)} · ${casesSummary.atRisk.label} needs action`
      : resultText;
    const financialRows = recoveryMetricRows as Array<(typeof recoveryMetricRows)[number] & { recoverable_minor?: number | null; recoverable_state?: 'known' | 'unavailable' }>;
    const gbpFinancialRows = financialRows.filter((row) => row.currency?.toUpperCase() === 'GBP');
    const recoverableRows = gbpFinancialRows.filter((row) => row.recoverable_state === 'known' && Number.isSafeInteger(row.recoverable_minor));
    const recoverableTotal = recoverableRows.reduce((sum, row) => sum + (row.recoverable_minor ?? 0), 0);
    const recoverableComplete = recoveryMetricCoverage === 'complete'
      && gbpFinancialRows.length > 0
      && gbpFinancialRows.every((row) => row.recoverable_state === 'known');
    const recoverableLabel = recoverableComplete
      ? formatMinorCurrencyNullable(recoverableTotal, 'GBP')
      : recoverableRows.length > 0
        ? `${formatMinorCurrencyNullable(recoverableTotal, 'GBP')} observed · partial`
        : 'Unavailable';
    const recoveryRateLabel = 'Confirmed-loss recovery basis is shown in Reports';

    addReplacement(queues, '23 of 218 · £10,006.00 needs action', toolbarResult);
    addReplacement(queues, '2 Aug – 1 Sep · the gap is the backlog', casesFlowWindow(casesFlow));
    addReplacement(queues, '+21', casesFlow ? `${casesFlow.netChange > 0 ? '+' : ''}${casesFlow.netChange}` : 'Unavailable');
    addReplacement(queues, 'opened · 268 total', `opened · ${casesFlow?.opened30d ?? '—'} total`);
    addReplacement(queues, 'closed · 247 total', `closed · ${casesFlow?.closed30d ?? '—'} total`);
    addReplacement(queues, '£10,006.00', casesSummary.atRisk.label);
    addReplacement(queues, '6', coverageByMetric.overdue === 'complete' ? formatNumber(queueCounts.overdue) : 'Unavailable');
    addReplacement(queues, '14', coverageByMetric.awaitingEvidence === 'complete' ? formatNumber(queueCounts.awaitingEvidence) : 'Unavailable');
    addReplacement(queues, '£4,602.76', recoverableLabel);
    addReplacement(queues, 'est. at 46.0% recovery rate', recoveryRateLabel);

    const rowReplacer = (claim: ClaimRow, index: number) => {
      const [sourceRef, sourceCustomer, sourceOrder, sourceStatus, sourceAction, sourceMoney] = SOURCE_ROWS[index];
      // Row-local queues prevent repeated source literals consuming inspector
      // replacements or another row's identity, amount and next action.
      const rowQueues = new Map<string, string[]>();
      const customer = claim.customer_id ? customerById.get(claim.customer_id) ?? null : null;
      const ops = claimNextAction(claim, latestOutcomeByClaimId.get(claim.id) ?? null, currentUserId);
      addReplacement(rowQueues, sourceRef, shortRef(claim.id, claim.id));
      addReplacement(rowQueues, sourceCustomer, claimLabel(claim, customer));
      addReplacement(rowQueues, sourceOrder, claimOrderLabel(claim));
      addReplacement(rowQueues, sourceStatus, statusLabel(claim.status));
      addReplacement(rowQueues, sourceAction, ops.nextActionLabel);
      addReplacement(rowQueues, sourceMoney, displayMoney(claim));
      return (value: string) => consumeSuppliedText(value, rowQueues);
    };
    addReplacement(queues, '10 of 23 in this queue', `${formatNumber(claims.length)} of ${formatNumber(totalMatching)} in this queue`);

    if (selected && selectedOps) {
      const demo = screenshot ? screenshotCaseContext(selected.customer_id ?? selected.id, Math.round((selected.amount_at_risk ?? 0) * 100)) : null;
      const selectedMoney = displayMoney(selected);
      const financialSelected = selected as FinancialClaim;
      const selectedRecoverable = financialSelected.recoverable_state === 'known'
        ? formatMinorCurrencyNullable(financialSelected.recoverable_minor ?? null, selected.currency)
        : 'Unavailable';
      const orderRef = shortRef(selected.order_ref ?? selected.shopify_order_id, selected.id);
      const orderDate = selected.submitted_at ? formatDateAbsolute(new Date(selected.submitted_at)) : 'date unavailable';
      addReplacement(queues, 'CASE-4187 · CONTEXT', `${shortRef(selected.id, selected.id)} · CONTEXT`);
      addReplacement(queues, 'Maya Cheng · not delivered', claimLabel(selected, selectedCustomer));
      addReplacement(queues, '£4,180.00', selectedMoney);
      addReplacement(queues, '£4,180.00', selectedRecoverable);
      addReplacement(queues, '#AS-88214 · 22 Aug', `${orderRef} · ${orderDate}`);
      addReplacement(queues, '1Z99·8841 · UPS', demo?.tracking ?? 'Unavailable · source not linked');
      addReplacement(queues, '51204 · Gorgias', selected.source_ticket_ref ? `${selected.source_ticket_ref} · Gorgias` : 'Unavailable · support source not linked');
      addReplacement(queues, 'Merchant decision · due in 4h', selectedOps.nextActionLabel);
      addReplacement(queues, 'UPS delivered scan observed', demo ? 'Order, support and delivery records linked' : selectedOps.evidenceStatus);
      addReplacement(queues, '29 Aug 14:02 · UPS API', formatDateAbsolute(new Date(selected.updated_at)));
      addReplacement(queues, 'Rule PR-12 recommended deny', selectedEvidence ? `Evidence package generated · ${selectedEvidence.reference_number}` : demo ? 'Source evidence indexed and ready for review' : 'Evidence package not generated');
      addReplacement(queues, '29 Aug 14:05 · advisory only', selectedEvidence ? formatDateAbsolute(new Date(selectedEvidence.generated_at)) : demo ? formatDateAbsolute(new Date(selected.updated_at)) : 'No recorded timestamp');
      addReplacement(queues, 'Customer replied in ticket', selectedOutcome ? 'Merchant decision recorded' : demo ? 'Customer conversation received · Gorgias' : 'Merchant decision not recorded');
      addReplacement(queues, '27 Aug 09:41 · Gorgias', selectedOutcome ? formatDateAbsolute(new Date(selectedOutcome.updated_at)) : demo ? formatDateAbsolute(new Date(selected.updated_at)) : 'No recorded timestamp');
      addReplacement(queues, 'One gap: no recorded human interpretation of the delivery photo.', selectedOps.reviewState);
      addReplacement(queues, '£4,912.00', demo ? formatMinorCurrencyNullable(demo.spendMinor, selected.currency) ?? 'Unavailable' : 'Unavailable');
      addReplacement(queues, '31 · last 22 Aug', demo ? `${demo.orders} · last ${orderDate}` : 'Unavailable');
      addReplacement(queues, '5 in 90 days', demo ? `${demo.priorCases} in 90 days` : 'Unavailable');
      addReplacement(queues, '2 refunds, 1 denial, 1 replacement, 1 open', demo ? `${demo.priorCases} resolved · no outstanding follow-up` : selectedCustomer ? `${customerDisplayName(selectedCustomer)} · outcome history unavailable` : 'Unavailable');
    }

    const replaceText = (value: string) => consumeSuppliedText(value, queues);
    const previous = page > 1 ? `${basePath}?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}` : null;
    const next = page < totalPages ? `${basePath}?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}` : null;
    const actions = new Map<string, ClickHandler>([
      ['New case', () => router.push(`${basePath}?new=1`)],
      ['Previous', () => { if (previous) router.push(previous); }],
      ['Next', () => { if (next) router.push(next); }],
      ['Open case review', () => { if (selected) router.push(`${basePath}/${encodeURIComponent(selected.id)}`); }],
      ['Assign', () => { if (selected) router.push(`${basePath}/${encodeURIComponent(selected.id)}?action=assign`); }],
    ]);
    const source = SuppliedVisualBody();
    const templates: Array<{ node: ReactElement; sourceIndex: number }> = [];
    const collectRows = (node: ReactNode): void => {
      if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(node)) return;
      const sourceIndex = isSourceRow(node, compactText(node));
      if (sourceIndex >= 0) templates.push({ node, sourceIndex });
      else Children.forEach(node.props.children, collectRows);
    };
    collectRows(source);
    const renderRows = () => claims.map((claim, index) => {
      const template = templates[index % templates.length];
      const row = bindTree(template.node, rowReplacer(claim, template.sourceIndex), actions,
        claims, selectedId, selectClaim, null, false, undefined, claim);
      return isValidElement(row) ? cloneElement(row, { key: claim.id }) : row;
    });
    const activeFilterCount = ['queue', 'owner', 'viewed', 'status', 'evidence_posture', 'responsibility', 'claim_readiness', 'deadline'].filter(key => sp[key]).length;
    const filterControls = <CasesCompactFilters resultText={resultText} filterTabs={filterTabs} sp={sp} basePath={basePath} activeFilterCount={activeFilterCount} />;
    return bindTree(source, replaceText, actions, claims, selectedId, selectClaim, null, false, renderRows, undefined, filterControls, <CasesFlowChart flow={casesFlow} />, <CasesQueueTabs filterTabs={filterTabs} />);
  }, [screenshot, basePath, casesFlow, casesSummary.atRisk.label, claims, coverageByMetric, currentUserId, customerById, filterTabs, latestOutcomeByClaimId, listView.kind, page, queueCounts, recoveryMetricCoverage, recoveryMetricRows, resultText, router, selected, selectedCustomer, selectedEvidence, selectedId, selectedOps, selectedOutcome, sp, totalMatching, totalPages]);

  return (
    <>
      {screenshot ? <SetBreadcrumbLabel label="Cases" detail={`${formatNumber(totalMatching)} cases · ${formatNumber(claims.length)} on this page`} /> : null}
      {!connectionState.helpdesk ? (
        <div data-state-id="cases-partial-source" style={{ minHeight: 35, padding: '0 22px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #ead8b6', background: '#fff3e9', color: '#7a5310', font: "400 10.5px/1.4 'Inter',sans-serif" }}>
          <span style={{ width: 6, height: 6, flex: '0 0 6px', borderRadius: '50%', background: '#c98a1a' }} />
          <span style={{ flex: 1 }}>Case context is partial because a support source is not connected.</span>
          <button type="button" onClick={() => router.push('/sources/connected')} style={{ border: 0, padding: 0, background: 'transparent', color: '#7a5310', fontWeight: 500, cursor: 'pointer' }}>Complete setup</button>
        </div>
      ) : null}
      {bound}
      <ManualCaseDialog open={sp.new === '1'} />
    </>
  );
}
