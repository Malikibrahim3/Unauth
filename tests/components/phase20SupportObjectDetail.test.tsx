/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { ConnectedObjectDetail } from '@/components/relationships/ConnectedObjectDetail';
import { ConnectedObjectNotFound } from '@/components/relationships/ConnectedObjectNotFound';
import { SupportObjectRouteSkeleton } from '@/components/relationships/SupportObjectRouteSkeleton';
import type { ObjectSummary } from '@/lib/relationships/objectSummary';

const TICKET: ObjectSummary = {
  id: 'ticket-row-id',
  type: 'ticket',
  reference: 'provider-ticket-734',
  sourceId: 'provider-ticket-734',
  provider: 'gorgias',
  state: 'open',
  updatedAt: '2026-07-29T10:00:00.000Z',
  amount: null,
  currency: null,
  sourceOrderId: null,
  customer: { type: 'customer', id: 'customer-id', reference: 'Maya Chen', href: '/customers/customer-id' },
  connected: [
    { type: 'customer', id: 'customer-id', reference: 'Maya Chen', href: '/customers/customer-id' },
    { type: 'order', id: 'order-id', reference: '10042', href: '/orders/order-id' },
    { type: 'refund', id: 'refund-id', reference: 'Refund 54', href: '/refunds/refund-id' },
    { type: 'payout case', id: 'case-id', reference: 'delivery issue · 6a77e1c9', href: '/claims/case-id', state: 'open' },
  ],
  facts: [
    { label: 'Subject', value: 'Where is my parcel?' },
    { label: 'Status', value: 'open' },
    { label: 'Messages', value: 2, kind: 'number' },
  ],
  items: [],
  timeline: [],
  conversation: [
    { id: 'message-1', kind: 'message', title: 'Message', summary: 'The parcel has not arrived.', actor: 'customer', visibility: 'public', at: '2026-07-28T09:00:00.000Z' },
    { id: 'activity-1', kind: 'activity', title: 'status_changed', summary: 'Ticket status changed to open.', actor: 'agent', visibility: null, at: '2026-07-28T10:00:00.000Z' },
  ],
  evidence: [],
  payoutCases: [{ type: 'payout case', id: 'case-id', reference: 'delivery issue · 6a77e1c9', href: '/claims/case-id', state: 'open' }],
  provenance: {
    sourceSystem: 'gorgias',
    externalId: 'provider-ticket-734',
    sourceUrl: 'https://acme.gorgias.com/app/ticket/734',
    freshness: 'stale',
    syncState: 'disconnected',
    lastSyncedAt: '2026-07-29T09:58:00.000Z',
    sourceCreatedAt: '2026-07-28T09:00:00.000Z',
    sourceUpdatedAt: '2026-07-29T10:00:00.000Z',
    connectorVersion: null,
    payloadHash: 'not-rendered',
  },
};

describe('Phase 20 dispute and ticket connected-object detail', () => {
  it('makes ticket conversation primary while retaining canonical customer, case, order, refund, and source context', () => {
    render(<ConnectedObjectDetail object={TICKET} />);

    expect(screen.getByRole('heading', { name: 'Where is my parcel?' })).toBeInTheDocument();
    expect(screen.queryByText('provider-ticket-734')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conversation and activity' })).toBeInTheDocument();
    expect(screen.getByText('Customer message')).toBeInTheDocument();
    expect(screen.getByText('The parcel has not arrived.')).toBeInTheDocument();

    const connected = screen.getByRole('heading', { name: 'Connected records' }).parentElement!;
    expect(within(connected).getByRole('link', { name: /10042/i })).toHaveAttribute('href', '/orders/order-id?return=%2Ftickets%2Fticket-row-id');
    expect(within(connected).getByRole('link', { name: /refund 54/i })).toHaveAttribute('href', '/refunds/refund-id?return=%2Ftickets%2Fticket-row-id');
    expect(within(connected).getByRole('link', { name: /delivery issue/i })).toHaveAttribute('href', '/claims/case-id?return=%2Ftickets%2Fticket-row-id');

    const provenance = screen.getByTestId('support-object-provenance');
    expect(provenance).toHaveTextContent('Stale');
    expect(provenance).toHaveTextContent('Not connected');
    expect(screen.queryByText('not-rendered')).not.toBeInTheDocument();
  });

  it('gives a dispute financial facts and lifecycle without reusing case status as a lifecycle', () => {
    render(<ConnectedObjectDetail object={{
      ...TICKET,
      id: 'dispute-row-id',
      type: 'dispute',
      reference: 'provider-dispute-38',
      facts: [
        { label: 'Dispute type', value: 'chargeback' },
        { label: 'Amount', value: 129, kind: 'money', currency: 'GBP' },
        { label: 'Status', value: 'needs_response' },
      ],
      conversation: [],
      timeline: [{ label: 'Dispute initiated', at: '2026-07-28T09:00:00.000Z', detail: 'item not received' }],
    }} />);

    expect(screen.getByRole('heading', { name: 'Chargeback dispute' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Financial context' })).toBeInTheDocument();
    expect(screen.getByText('£129.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dispute lifecycle' })).toBeInTheDocument();
    expect(screen.getByText('Dispute initiated')).toBeInTheDocument();
  });

  it('reserves conversation geometry while the ticket detail is loading', () => {
    render(<SupportObjectRouteSkeleton title="Loading support ticket" conversation />);
    expect(screen.getByLabelText('Loading support ticket')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('.ua-working-surface')).toBeInTheDocument();
    expect(document.querySelectorAll('.ua-joined-section')).toHaveLength(3);
  });

  it('names an unavailable ticket record and provides a safe recovery destination', () => {
    render(<ConnectedObjectNotFound kind="support ticket" />);
    expect(screen.getAllByRole('heading', { name: 'Support ticket not found' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Return to customers' })).toHaveAttribute('href', '/customers');
  });
});
