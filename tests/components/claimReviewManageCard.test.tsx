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
    patch: jest.fn(),
    dispatch: jest.fn(),
    state: {
      decision: 'approved',
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

  it('surfaces the management actions when the user can manage', () => {
    const { wb } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    expect(screen.getByRole('button', { name: /Assign to me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Record decision$/i })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /^Record decision$/i }));
    expect(screen.getByRole('dialog', { name: /Record merchant decision/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm & record$/i }));
    expect(handlers.onOutcome).toHaveBeenCalled();
  });

  it('does not record a decision when confirmation is cancelled', () => {
    const { wb, handlers } = makeWorkbench();
    render(<ClaimReviewManageCard wb={wb} canManage />);
    fireEvent.click(screen.getByRole('button', { name: /^Record decision$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(handlers.onOutcome).not.toHaveBeenCalled();
  });

  it('offers reversal only once a decision is on record', () => {
    const withOutcome = makeWorkbench({ latestOutcome: { decision: 'approved', outcome: 'loss' } });
    render(<ClaimReviewManageCard wb={withOutcome.wb} canManage />);
    expect(screen.getByRole('button', { name: /Reverse decision/i })).toBeInTheDocument();
  });
});
