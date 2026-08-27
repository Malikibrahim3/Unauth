/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';

jest.mock('next/navigation', () => ({
  usePathname: () => '/financials/reconciliation',
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const openException = {
  id: 'e1', support_payout_case_id: 'c1', exception_type: 'match_uncertainty', confidence: 'probable', status: 'open',
  title: 'Probable order match', detail: 'Confirm the match.', assigned_to: null, created_at: '2026-07-12T12:00:00Z',
  context: { is_match_exception: true, candidates: [{ id: 'candidate-1', entity_type: 'order', entity_id: 'order-2', confidence: 0.8 }] },
};

describe('ExceptionQueue', () => {
  afterEach(() => jest.restoreAllMocks());
  it('requires an explicit candidate and audit note before confirming a probable match', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ exceptions: [openException] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assignment: { assigned_to: 'user-1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as never;
    render(<ExceptionQueue />);
    expect((await screen.findAllByText('Probable order match')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /assign to me/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ops/exceptions/e1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: /confirm selected match/i }));
    expect(screen.getByRole('button', { name: /record decision/i })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /audit note/i }), { target: { value: 'Verified against the source order and ledger amount.' } });
    fireEvent.click(screen.getByRole('button', { name: /record decision/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ops/exceptions/e1', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      action: 'confirm',
      selectedCandidateId: 'candidate-1',
      resolution: 'Verified against the source order and ledger amount.',
    });
  });
});
