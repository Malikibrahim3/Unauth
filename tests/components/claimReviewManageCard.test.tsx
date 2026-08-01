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
    state: {
      decision: 'approved',
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
    expect(button).toHaveStyle({ background: 'var(--ua-surface-muted)' });
  });

  it('offers reversal only once a decision is on record', () => {
    const withOutcome = makeWorkbench({ latestOutcome: { decision: 'approved', outcome: 'loss' } });
    render(<ClaimReviewManageCard wb={withOutcome.wb} canManage />);
    expect(screen.getByRole('button', { name: /Reverse decision/i })).toBeInTheDocument();
  });
});
