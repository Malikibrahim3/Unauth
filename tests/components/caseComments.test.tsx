/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CaseComments } from '@/components/collaboration/CaseComments';

describe('CaseComments', () => {
  it('renders plain-text comments and posts selected mentions', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comments: [{ id: 'c1', author_user_id: 'u1', body: '<b>plain text</b>', deleted_at: null, created_at: '2026-07-11T10:00:00Z' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ members: [{ user_id: '00000000-0000-0000-0000-000000000002', invited_email: 'ops@example.com', invite_status: 'active' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comment: { id: 'c2' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comments: [] }) });
    global.fetch = fetchMock as never;
    render(<CaseComments caseId="case-1" canComment />);

    expect(await screen.findByText('<b>plain text</b>')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /add a comment/i }), { target: { value: 'Please review' } });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'ops@example.com' }));
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      body: 'Please review',
      mentionedUserIds: ['00000000-0000-0000-0000-000000000002'],
    });
  });
});
