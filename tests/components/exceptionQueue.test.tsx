/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';

const openException = {
  id: 'e1', support_payout_case_id: 'c1', exception_type: 'match_uncertainty', confidence: 'probable', status: 'open',
  title: 'Probable order match', detail: 'Confirm the match.', assigned_to: null, created_at: '2026-07-12T12:00:00Z',
  context: { is_match_exception: true, candidates: [{ id: 'candidate-1', entity_type: 'order', entity_id: 'order-2', confidence: 0.8 }] },
};

describe('ExceptionQueue', () => {
  afterEach(() => jest.restoreAllMocks());
  it('assigns and confirms a selected probable match through the queue API', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ exceptions: [openException] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assignment: { assigned_to: 'user-1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as never;
    render(<ExceptionQueue />);
    expect(await screen.findByText('Probable order match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /assign to me/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ops/exceptions/e1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.change(screen.getByRole('combobox', { name: /candidate/i }), { target: { value: 'candidate-1' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm match/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ops/exceptions/e1', expect.objectContaining({ method: 'POST' })));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ action: 'confirm', selectedCandidateId: 'candidate-1' });
    expect(confirm).toHaveBeenCalled();
  });
});
