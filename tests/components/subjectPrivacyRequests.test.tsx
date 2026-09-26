/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubjectErasureClient from '@/components/settings/SubjectErasureClient';

const subjectA = '11111111-1111-4111-8111-111111111111';
const subjectB = '22222222-2222-4222-8222-222222222222';
const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const receipt = (id: string) => ({ receipt: { id, scope_counts: {}, effective_at: '', recorded_at: '' }, steps: [] });
const response = (body: unknown, ok = true) => ({ ok, json: async () => body, blob: async () => new Blob(['{}'], { type: 'application/json' }) });
function deferred() {
  let resolve!: (value: ReturnType<typeof response>) => void;
  const promise = new Promise<ReturnType<typeof response>>(done => { resolve = done; });
  return { promise, resolve };
}
function choose(id: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'CANONICAL CUSTOMER ID' }), { target: { value: id } });
}
beforeEach(() => {
  fetchMock.mockReset(); global.fetch = fetchMock;
  URL.createObjectURL = jest.fn(() => 'blob:local-privacy-test');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  global.fetch = originalFetch; URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  jest.restoreAllMocks();
});

it('clears an old status error when retry succeeds', async () => {
  fetchMock.mockResolvedValueOnce(response({ error: 'Status temporarily unavailable' }, false)).mockResolvedValueOnce(response(receipt('new-receipt')));
  render(<SubjectErasureClient />); choose(subjectA);
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Status temporarily unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  await screen.findByText('new-receipt');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('allows a new subject request while discarding the previous subject response and pending state', async () => {
  const old = deferred(); const next = deferred();
  fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  render(<SubjectErasureClient />); choose(subjectA);
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  choose(subjectB);
  expect(screen.getByRole('button', { name: 'Check status' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  await act(async () => old.resolve(response(receipt('wrong-subject-receipt'))));
  expect(screen.queryByText('wrong-subject-receipt')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
  await act(async () => next.resolve(response(receipt('correct-subject-receipt'))));
  await screen.findByText('correct-subject-receipt');
});

it('does not cancel a requested export when checking the same subject status', async () => {
  const download = deferred();
  fetchMock.mockReturnValueOnce(download.promise).mockResolvedValueOnce(response(receipt('same-subject')));
  render(<SubjectErasureClient />); choose(subjectA);
  fireEvent.click(screen.getByRole('button', { name: 'Download subject JSON' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  await screen.findByText('same-subject');
  await act(async () => download.resolve(response({})));
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
});

it('does not start a late download after leaving the privacy screen', async () => {
  const download = deferred(); fetchMock.mockReturnValueOnce(download.promise);
  const { unmount } = render(<SubjectErasureClient />); choose(subjectA);
  fireEvent.click(screen.getByRole('button', { name: 'Download subject JSON' }));
  unmount();
  await act(async () => download.resolve(response({})));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('does not start a download when the subject changes while its response body is streaming', async () => {
  let finishBlob!: (value: Blob) => void;
  const blob = new Promise<Blob>(resolve => { finishBlob = resolve; });
  fetchMock.mockResolvedValueOnce({ ok: true, blob: () => blob });
  render(<SubjectErasureClient />); choose(subjectA);
  fireEvent.click(screen.getByRole('button', { name: 'Download subject JSON' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  choose(subjectB);
  await act(async () => finishBlob(new Blob(['{}'])));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
