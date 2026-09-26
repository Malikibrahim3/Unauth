/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimReviewManageCard } from '@/components/claims/ClaimReviewManageCard';

function makeWorkbench(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onOutcome: jest.fn(),
    onEvidence: jest.fn(),
    onAssignment: jest.fn(),
    onSnooze: jest.fn(),
    onClearSnooze: jest.fn(),
    onReverse: jest.fn(),
    onStatusChange: jest.fn(),
    onReopen: jest.fn(),
    onReplacementDispatch: jest.fn(),
  };
  const wb = {
    claimId: 'case-1',
    busy: false,
    claimIsClosed: false,
    latestOutcome: null,
    decisionData: null,
    selectedClaim: {
      currency: 'GBP',
      assigned_to: null,
      status: 'open',
    },
    patch: jest.fn(),
    dispatch: jest.fn(),
    showMsg: jest.fn(),
    state: {
      decision: 'approved',
      resolution: '',
      replacementQuantities: {},
      duplicateConcessionJustification: '',
      replacementExternalReference: '',
      replacementReceiptNote: '',
      replacementActualCost: '',
      replacementCostNote: '',
      decisionAmount: '10.00',
      outcome: 'loss',
      notes: '',
      evidenceType: 'tracking',
      source: 'manual',
      evidenceUrl: '',
      statusToSet: 'evidence_needed',
      statusNote: '',
      reopenNote: '',
      reverseDecision: 'denied',
      reverseOutcome: 'pending',
      reverseNote: '',
      snoozeDays: '2',
      snoozeReason: '',
      railOpen: { manage: true },
    },
    ...handlers,
    ...overrides,
  };
  return { wb: wb as never, handlers };
}

describe('ClaimReviewManageCard', () => {
  it('shows a read-only notice when the user cannot manage', () => {
    const { wb } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage={false} />);
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assign to me/i })).not.toBeInTheDocument();
  });

  it('keeps decision controls unavailable when required context failed', () => {
    const { wb } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage contextStatus="unavailable" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      /required evidence context cannot be loaded/i,
    );
    expect(screen.queryByRole('button', { name: /^Review decision$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /This load failure did not change the recorded decision or recovery state/i,
    );
  });

  it('surfaces the management actions when the user can manage', () => {
    const { wb } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByText('Manage evidence and lifecycle'));
    expect(screen.getByRole('button', { name: /Assign to me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Review decision$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add evidence/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Snooze$/i })).toBeInTheDocument();
  });

  it('wires assignment to the workbench handler', () => {
    const { wb, handlers } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByRole('button', { name: /Assign to me/i }));
    expect(handlers.onAssignment).toHaveBeenCalledWith('assign_to_me');
  });

  it('shows consequences before recording a decision, then calls onOutcome', () => {
    const { wb, handlers } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByRole('button', { name: /^Review decision$/i }));
    expect(screen.getByRole('dialog', { name: /Record merchant decision/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm & record$/i }));
    expect(handlers.onOutcome).toHaveBeenCalled();
  });

  it('does not record a decision when confirmation is cancelled', () => {
    const { wb, handlers } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByRole('button', { name: /^Review decision$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(handlers.onOutcome).not.toHaveBeenCalled();
  });

  it('does not style an incomplete decision as the enabled forward action', () => {
    const { wb } = makeWorkbench({
      state: {
        decision: '',
        decisionAmount: '10.00',
        outcome: 'loss',
        notes: '',
        evidenceType: 'tracking',
        source: 'manual',
        evidenceUrl: '',
        statusToSet: 'evidence_needed',
        statusNote: '',
        reopenNote: '',
        reverseDecision: 'denied',
        reverseOutcome: 'pending',
        reverseNote: '',
        snoozeDays: '2',
        snoozeReason: '',
        railOpen: { manage: true },
      },
    });
    render(<ClaimReviewManageCard wb={wb} canManage />);
    const button = screen.getByRole('button', { name: 'Decision not ready' });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ width: '100%' });
    expect(button).not.toHaveClass('ua-button');
    expect(button).toHaveAttribute('aria-describedby', 'manage-decision-requirement');
  });

  it('offers reversal only once a decision is on record', () => {
    const withOutcome = makeWorkbench({ latestOutcome: { decision: 'approved', outcome: 'loss' } });
    render(<ClaimReviewManageCard wb={withOutcome.wb} canManage />);
    fireEvent.click(screen.getByText('Manage evidence and lifecycle'));
    expect(screen.getByRole('button', { name: /Reverse decision/i })).toBeInTheDocument();
  });

  it.each(['', '-1', 'not a number'])('blocks reversal amount %j even when the unrelated decision draft has a valid amount', (reverseAmount) => {
    const base = makeWorkbench().wb;
    const { wb } = makeWorkbench({ latestOutcome: { decision: 'approved' }, state: { ...base.state, reverseNote: 'Correction', reverseAmount, decisionAmount: '99.00' } });
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByText('Manage evidence and lifecycle'));
    expect(screen.getByRole('button', { name: 'Reverse decision', exact: true })).toBeDisabled();
  });

  it('reviews a zero-value reversal independently of the new-decision draft', () => {
    const base = makeWorkbench().wb;
    const { wb, handlers } = makeWorkbench({ latestOutcome: { decision: 'approved' }, state: { ...base.state, reverseDecision: 'no_action', reverseNote: 'Correction', reverseAmount: '0', decisionAmount: '99.00' } });
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByText('Manage evidence and lifecycle'));
    fireEvent.click(screen.getByRole('button', { name: 'Reverse decision', exact: true }));
    const modal = screen.getByRole('dialog', { name: 'Reverse merchant decision' });
    expect(modal).toHaveTextContent('£0.00');
    expect(modal).not.toHaveTextContent('£99.00');
    fireEvent.click(screen.getByRole('button', { name: 'Record reversal', exact: true }));
    expect(handlers.onReverse).toHaveBeenCalledTimes(1);
  });

  it('keeps replacement unavailable when the server projection has a hard gate', () => {
    const { wb } = makeWorkbench({
      decisionData: {
        resolutionComparison: {
          version: 'resolution-comparison-v1', token: 'a'.repeat(64), caseVersion: 3,
          evidenceVersion: '2:current', policyVersion: 'v1.0:rule-1', currency: 'GBP',
          recommendation: 'request_customer_evidence', recommendationUncertainty: 'needs_more_evidence',
          recovery: { recoverability: 'possibly_recoverable', likelyOwner: 'carrier', nextAction: 'Collect scan', note: 'Possible recovery is separate and does not reduce the immediate resolution cost.' },
          replacement: { ready: false, unavailableReasons: ['P05 storage unavailable'], order: null, items: [], latestHandoff: null },
          options: [
            { action: 'full_refund', label: 'Full refund', customerResolution: 'Authorise a refund.', confirmable: true, unavailableReason: null, financial: true, costs: [{ id: 'refund', label: 'Refund amount', state: 'estimated', amountMinor: 1000, currency: 'GBP', provenance: 'Case amount at risk; estimate only' }], missingComponents: [], policyRestrictions: [], contradictions: [], preparedNextAction: 'Review the amount.' },
            { action: 'same_item_replacement', label: 'Same-item replacement', customerResolution: 'Prepare replacement.', confirmable: false, unavailableReason: 'P05 required', financial: true, costs: [], missingComponents: [], policyRestrictions: [], contradictions: [], preparedNextAction: 'Comparison only.' },
          ],
        },
      },
      state: {
        ...makeWorkbench().wb.state,
        resolution: 'same_item_replacement',
        decision: 'approved',
      },
    });
    render(<ClaimReviewManageCard wb={wb} canManage />);
    expect(screen.getByText(/Case v3/)).toBeInTheDocument();
    expect(screen.getByText(/Possible recovery is separate/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Same-item replacement — review only/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('P05 required');
    expect(screen.getByRole('button', { name: 'Decision not ready' })).toBeDisabled();
  });

  it('reviews exact replacement items and keeps dispatch receipt-backed and separate', () => {
    const { wb } = makeWorkbench({
      decisionData: {
        resolutionComparison: {
          version: 'resolution-comparison-v1', token: 'a'.repeat(64), caseVersion: 3,
          evidenceVersion: '2:current', policyVersion: 'v1.0:rule-1', currency: 'GBP',
          recommendation: 'manual_review', recommendationUncertainty: 'needs_more_evidence',
          priorConcession: { count: 1 },
          recovery: { recoverability: 'possibly_recoverable', likelyOwner: 'carrier', nextAction: 'Collect scan', note: 'Recovery stays separate.' },
          replacement: {
            ready: true, unavailableReasons: [],
            order: { id: 'order-1', externalId: '1001', reference: '#1001', currency: 'GBP', internalHref: '/orders/order-1', providerHref: 'https://unit-test.myshopify.com/admin/orders/1001', providerVerified: true },
            items: [{ claimedItemId: 'item-1', sourceOrderLineId: 'line-1', lineExternalId: 'line-ext-1', sku: 'SKU-1', variantRef: 'VAR-1', title: 'Original coat', orderedQuantity: 2, claimedQuantity: 2, confirmedReplacementQuantity: 0, outstandingAuthorisedQuantity: 0, availableQuantity: 2, costMinor: 1200, costCurrency: 'GBP', costProvenance: 'source_order_line_cost' }],
            latestHandoff: { id: 'action-1', state: 'handoff_ready', stateVersion: 1, externalReference: null, merchantReportedAt: null, observedSource: null, observedAt: null, amountMinor: 2500, currency: 'GBP', payload: { items: [{ sku: 'SKU-1', quantity: 2 }], manual_instructions: { summary: 'Create exact replacement' } } },
          },
          options: [{ action: 'same_item_replacement', label: 'Same-item replacement', customerResolution: 'Prepare replacement.', confirmable: true, unavailableReason: null, financial: true, costs: [], missingComponents: [], policyRestrictions: [], contradictions: ['Prior refund exists'], preparedNextAction: 'Review exact items.' }],
        },
      },
      state: {
        ...makeWorkbench().wb.state,
        resolution: 'same_item_replacement', decision: 'approved', decisionAmount: '25.00',
        notes: 'Replace the damaged original item.',
        replacementQuantities: { 'item-1': '2' },
        duplicateConcessionJustification: 'The refund covered shipping only.',
        replacementExternalReference: '', replacementReceiptNote: '',
      },
    });
    render(<ClaimReviewManageCard wb={wb} canManage />);
    expect(screen.getByLabelText('Replacement quantity for Original coat')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Review decision' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review decision' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Original coat');
    expect(screen.getByRole('dialog')).toHaveTextContent('SKU SKU-1');
    expect(screen.getByRole('button', { name: 'Copy instructions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open original order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record merchant-confirmed dispatch' })).toBeDisabled();
    expect(screen.getByText('Actual cost incurred').parentElement).toHaveTextContent('unavailable');
  });
});
